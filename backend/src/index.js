const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const pool = require('./config/db');
const { generateId, validateLuhn, detectCardNetwork, validateVpa, validateExpiry } = require('./utils/helpers');
const { paymentQueue, refundQueue, webhookQueue, connection } = require('./config/queue');
require('dotenv').config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// --- LOGIN ENDPOINT (Public) ---
app.post('/api/v1/login', async (req, res) => {
    const { email, secret } = req.body;

    try {
        if (!email || !secret) {
            return res.status(400).json({ error: 'Email and Secret are required' });
        }

        const result = await pool.query(
            "SELECT * FROM merchants WHERE email = $1 AND api_secret = $2",
            [email, secret]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json(result.rows[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// --- Middleware: Authentication ---
const authenticate = async (req, res, next) => {
  const apiKey = req.header('X-Api-Key');
  const apiSecret = req.header('X-Api-Secret');

  if (!apiKey || !apiSecret) {
    return res.status(401).json({ error: { code: "AUTHENTICATION_ERROR", description: "Invalid API credentials" } });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM merchants WHERE api_key = $1 AND api_secret = $2',
      [apiKey, apiSecret]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: { code: "AUTHENTICATION_ERROR", description: "Invalid API credentials" } });
    }

    req.merchant = result.rows[0];
    next();
  } catch (err) {
    res.status(500).json({ error: { code: "INTERNAL_ERROR", description: "Database error" } });
  }
};

// --- Middleware: Idempotency ---
const checkIdempotency = async (req, res, next) => {
    const key = req.header('Idempotency-Key');
    if (!key) return next();

    try {
        const result = await pool.query(
            'SELECT response, expires_at FROM idempotency_keys WHERE key = $1 AND merchant_id = $2',
            [key, req.merchant.id]
        );

        if (result.rows.length > 0) {
            const record = result.rows[0];
            if (new Date() < new Date(record.expires_at)) {
                return res.status(record.response.status || 200).json(record.response.body);
            } else {
                await pool.query('DELETE FROM idempotency_keys WHERE key = $1 AND merchant_id = $2', [key, req.merchant.id]);
            }
        }
        req.idempotencyKey = key;
        next();
    } catch (err) {
        console.error("Idempotency Check Error", err);
        next();
    }
};

// --- 1. Health Check ---
app.get('/health', async (req, res) => {
  let dbStatus = "disconnected";
  try {
    await pool.query('SELECT 1');
    dbStatus = "connected";
  } catch (e) {
    console.error("DB Health Check Failed", e);
  }

  res.status(200).json({
    status: "healthy",
    database: dbStatus,
    redis: connection.status === 'ready' ? "connected" : "disconnected",
    timestamp: new Date().toISOString()
  });
});

// --- 2. Create Order ---
app.post('/api/v1/orders', authenticate, async (req, res) => {
  const { amount, currency = "INR", receipt, notes } = req.body;

  if (!amount || !Number.isInteger(amount) || amount < 100) {
    return res.status(400).json({ error: { code: "BAD_REQUEST_ERROR", description: "amount must be at least 100" } });
  }

  const orderId = generateId('order_');
  
  try {
    const result = await pool.query(
      `INSERT INTO orders (id, merchant_id, amount, currency, receipt, notes, status) 
       VALUES ($1, $2, $3, $4, $5, $6, 'created') RETURNING *`,
      [orderId, req.merchant.id, amount, currency, receipt, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", description: "Could not create order" } });
  }
});

// --- 2.5. List Orders ---
app.get('/api/v1/orders', authenticate, async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  
  try {
    const query = `
        SELECT 
            o.*, 
            p.id as payment_id,
            COALESCE((SELECT SUM(amount) FROM refunds WHERE payment_id = p.id), 0) as refunded_amount
        FROM orders o
        LEFT JOIN payments p ON o.id = p.order_id AND p.status = 'success'
        WHERE o.merchant_id = $1 
        ORDER BY o.created_at DESC 
        LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [req.merchant.id, limit, offset]);
    res.json(result.rows); 
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", description: "Could not fetch orders" } });
  }
});

// --- 3. Get Order (Public/Private shared logic) ---
app.get('/api/v1/orders/:orderId', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND merchant_id = $2',
      [req.params.orderId, req.merchant.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: { code: "NOT_FOUND_ERROR", description: "Order not found" } });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get('/api/v1/orders/:orderId/public', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, amount, currency, status, merchant_id FROM orders WHERE id = $1', [req.params.orderId]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Order not found" });
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: "Server error" }); }
});

// --- 4. Create Payment (Async + Idempotency) ---
const processPaymentRequest = async (req, res, isPublic = false) => {
    const { order_id, method, vpa, card } = req.body;
    
    try {
        // 1. Validate Order
        const orderResult = await pool.query('SELECT * FROM orders WHERE id = $1', [order_id]);
        if (orderResult.rows.length === 0) {
            return res.status(404).json({ error: { code: "NOT_FOUND_ERROR", description: "Order not found" } });
        }
        const order = orderResult.rows[0];
        
        // If authenticated, check ownership
        if (!isPublic && req.merchant && order.merchant_id !== req.merchant.id) {
            return res.status(400).json({ error: { code: "BAD_REQUEST_ERROR", description: "Order does not belong to merchant" } });
        }
        const merchantId = order.merchant_id;

        // 2. Validate Payment Details
        let cardNetwork = null;
        let cardLast4 = null;

        if (method === 'upi') {
            if (!vpa || !validateVpa(vpa)) {
                return res.status(400).json({ error: { code: "INVALID_VPA", description: "VPA format invalid" } });
            }
        } else if (method === 'card') {
            if (!card || !validateLuhn(card.number)) {
                return res.status(400).json({ error: { code: "INVALID_CARD", description: "Card validation failed" } });
            }
            if (!validateExpiry(card.expiry_month, card.expiry_year)) {
                 return res.status(400).json({ error: { code: "EXPIRED_CARD", description: "Card expiry date invalid" } });
            }
            cardNetwork = detectCardNetwork(card.number);
            cardLast4 = card.number.replace(/[\s-]/g, '').slice(-4);
        } else {
            return res.status(400).json({ error: { code: "BAD_REQUEST_ERROR", description: "Invalid payment method" } });
        }

        // 3. Create Payment Record (Pending)
        const paymentId = generateId('pay_');
        const status = 'pending'; 

        const insertQuery = `
          INSERT INTO payments 
          (id, order_id, merchant_id, amount, currency, method, status, vpa, card_network, card_last4, captured)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)
          RETURNING *
        `;
        
        const paymentResult = await pool.query(insertQuery, [
            paymentId, order_id, merchantId, order.amount, order.currency, 
            method, status, vpa || null, cardNetwork, cardLast4
        ]);

        const responseBody = paymentResult.rows[0];

        // 4. Enqueue Job
        await paymentQueue.add('process-payment', { paymentId });

        // 5. Save Idempotency (if key exists)
        if (req.idempotencyKey) {
            await pool.query(
                `INSERT INTO idempotency_keys (key, merchant_id, response, expires_at)
                 VALUES ($1, $2, $3, NOW() + INTERVAL '24 hours')`,
                [req.idempotencyKey, req.merchant.id, { status: 201, body: responseBody }]
            );
        }

        res.status(201).json(responseBody);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: { code: "INTERNAL_ERROR", description: "Payment processing error" } });
    }
};

app.post('/api/v1/payments', authenticate, checkIdempotency, (req, res) => processPaymentRequest(req, res, false));
app.post('/api/v1/payments/public', (req, res) => processPaymentRequest(req, res, true));

// --- 5. Get Payment ---
app.get('/api/v1/payments/:paymentId', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM payments WHERE id = $1', [req.params.paymentId]);
        if (result.rows.length === 0) return res.status(404).json({ error: "Payment not found" });
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: "Server error" }); }
});

// --- 6. Create Refund (Async) ---
app.post('/api/v1/payments/:paymentId/refunds', authenticate, async (req, res) => {
    const { amount, reason } = req.body;
    const { paymentId } = req.params;

    try {
        const payRes = await pool.query('SELECT * FROM payments WHERE id = $1 AND merchant_id = $2', [paymentId, req.merchant.id]);
        if (payRes.rows.length === 0) return res.status(404).json({error: "Payment not found"});
        const payment = payRes.rows[0];

        if (payment.status !== 'success') {
            return res.status(400).json({error: {code: "BAD_REQUEST_ERROR", description: "Payment not successful"}});
        }

        const refRes = await pool.query("SELECT SUM(amount) as total FROM refunds WHERE payment_id = $1", [paymentId]);
        const totalRefunded = parseInt(refRes.rows[0].total || 0);
        
        if (amount > (payment.amount - totalRefunded)) {
            return res.status(400).json({error: {code: "BAD_REQUEST_ERROR", description: "Refund amount exceeds available"}});
        }

        const refundId = generateId('rfnd_');
        const result = await pool.query(
            `INSERT INTO refunds (id, payment_id, merchant_id, amount, reason, status)
             VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
            [refundId, paymentId, req.merchant.id, amount, reason]
        );

        await refundQueue.add('process-refund', { refundId });
        
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// --- 7. Capture Payment (NEW - Mandatory) ---
app.post('/api/v1/payments/:id/capture', authenticate, async (req, res) => {
  const { id } = req.params;

  try {
    const paymentResult = await pool.query(
      'SELECT * FROM payments WHERE id = $1 AND merchant_id = $2',
      [id, req.merchant.id]
    );

    if (paymentResult.rows.length === 0) {
      return res.status(404).json({ error: { code: "NOT_FOUND", description: "Payment not found" } });
    }

    const payment = paymentResult.rows[0];

    if (payment.status !== 'success') {
      return res.status(400).json({ error: { code: "BAD_REQUEST", description: "Payment not in capturable state" } });
    }
    if (payment.captured) {
      return res.status(400).json({ error: { code: "BAD_REQUEST", description: "Payment already captured" } });
    }

    const updateQuery = `
      UPDATE payments 
      SET captured = true, updated_at = NOW() 
      WHERE id = $1 
      RETURNING *
    `;
    const updatedPayment = await pool.query(updateQuery, [id]);

    res.json(updatedPayment.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: { code: "INTERNAL_ERROR", description: "Capture failed" } });
  }
});

// --- 8. Webhook Logs & Retry ---
app.get('/api/v1/webhooks', authenticate, async (req, res) => {
    const { limit = 10, offset = 0 } = req.query;
    try {
        const result = await pool.query(
            'SELECT * FROM webhook_logs WHERE merchant_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
            [req.merchant.id, limit, offset]
        );
        res.json({ data: result.rows, limit, offset });
    } catch (e) { res.status(500).json({ error: "Server Error" }); }
});

app.post('/api/v1/webhooks/:logId/retry', authenticate, async (req, res) => {
    const { logId } = req.params;
    try {
        const logRes = await pool.query('SELECT * FROM webhook_logs WHERE id = $1 AND merchant_id = $2', [logId, req.merchant.id]);
        if (logRes.rows.length === 0) return res.status(404).json({error: "Log not found"});

        const log = logRes.rows[0];
        await pool.query("UPDATE webhook_logs SET status = 'pending', attempts = 0 WHERE id = $1", [logId]);
        
        await webhookQueue.add('deliver-webhook', {
            logId, 
            merchantId: log.merchant_id, 
            payload: log.payload
        });

        res.json({ id: logId, status: "pending", message: "Webhook retry scheduled" });
    } catch (e) { res.status(500).json({ error: "Server Error" }); }
});

// --- 9. Test Jobs Status (NEW - Required for Evaluation) ---
app.get('/api/v1/test/jobs/status', async (req, res) => {
    try {
        const paymentPending = await paymentQueue.getWaitingCount();
        const paymentActive = await paymentQueue.getActiveCount();
        const paymentCompleted = await paymentQueue.getCompletedCount(); 
        const paymentFailed = await paymentQueue.getFailedCount();

        res.json({
            pending: paymentPending,
            processing: paymentActive,
            completed: paymentCompleted,
            failed: paymentFailed,
            worker_status: "running"
        });
    } catch (e) { 
        console.error("🔴 JOB STATUS ERROR:", e);
        res.status(500).json({ error: "Redis Error", details: e.message }); 
    }
});

// Start Server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});