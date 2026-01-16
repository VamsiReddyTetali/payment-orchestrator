const { Worker } = require('bullmq');
const pool = require('./config/db');
const axios = require('axios');
const crypto = require('crypto');
const { webhookQueue, connection } = require('./config/queue');
require('dotenv').config();

console.log("Worker Script Loaded - v3 (Final)");

// --- Helper: Enqueue Webhook ---
const enqueueWebhook = async (merchantId, event, data) => {
    try {
        const merchantRes = await pool.query('SELECT webhook_url FROM merchants WHERE id = $1', [merchantId]);
        
        if (merchantRes.rows.length === 0) return;
        const webhookUrl = merchantRes.rows[0].webhook_url;
        if (!webhookUrl) return;

        const payload = {
            event,
            timestamp: Math.floor(Date.now() / 1000),
            data
        };

        const logRes = await pool.query(
            `INSERT INTO webhook_logs (merchant_id, event, payload, status, next_retry_at) 
             VALUES ($1, $2, $3, 'pending', NOW()) RETURNING id`,
            [merchantId, event, payload]
        );

        console.log(`[Helper] Enqueueing job for log ID: ${logRes.rows[0].id}`);

        await webhookQueue.add('deliver-webhook', {
            logId: logRes.rows[0].id,
            merchantId,
            payload
        });

    } catch (err) {
        console.error(`[Helper] ERROR in enqueueWebhook:`, err);
        throw err;
    }
};

// --- WORKER 1: Process Payment ---
new Worker('payment-queue', async (job) => {
    const { paymentId } = job.data;
    console.log(`[PaymentWorker] START Processing: ${paymentId}`);

    try {
        const res = await pool.query('SELECT * FROM payments WHERE id = $1', [paymentId]);
        const payment = res.rows[0];
        if (!payment) return;

        // Simulate Delay
        const isTestMode = process.env.TEST_MODE === 'true';
        const delay = isTestMode 
            ? (parseInt(process.env.TEST_PROCESSING_DELAY) || 1000) 
            : Math.random() * 5000 + 5000;
        
        await new Promise(r => setTimeout(r, delay));

        // Determine Outcome
        let success;
        if (isTestMode && process.env.TEST_PAYMENT_SUCCESS) {
            success = process.env.TEST_PAYMENT_SUCCESS === 'true';
        } else {
            const rate = payment.method === 'upi' ? 0.90 : 0.95;
            success = Math.random() < rate;
        }

        const status = success ? 'success' : 'failed';
        const error_code = success ? null : 'PAYMENT_FAILED';
        const error_desc = success ? null : 'Processing failed';

        await pool.query(
            'UPDATE payments SET status = $1, error_code = $2, error_description = $3, updated_at = NOW() WHERE id = $4',
            [status, error_code, error_desc, paymentId]
        );

        if (success) {
            await pool.query(
                'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = (SELECT order_id FROM payments WHERE id = $2)',
                ['paid', paymentId]
            );
        }
        
        const event = success ? 'payment.success' : 'payment.failed';
        const updatedPayment = (await pool.query('SELECT * FROM payments WHERE id = $1', [paymentId])).rows[0];
        
        await enqueueWebhook(payment.merchant_id, event, { payment: updatedPayment });

    } catch (error) {
        console.error(`[PaymentWorker] CRITICAL ERROR:`, error);
        throw error;
    }

}, { connection });

// --- WORKER 2: Process Refund ---
new Worker('refund-queue', async (job) => {
    console.log(`[RefundWorker] Processing Refund: ${job.data.refundId}`);
    try {
        await new Promise(r => setTimeout(r, 2000));
        await pool.query("UPDATE refunds SET status = 'processed', processed_at = NOW() WHERE id = $1", [job.data.refundId]);
        console.log(`[RefundWorker] Refund Processed.`);
    } catch (e) {
        console.error(`[RefundWorker] Error`, e);
    }
}, { connection });

// --- WORKER 3: Deliver Webhook ---
new Worker('webhook-queue', async (job) => {
    console.log(`[WebhookWorker] Delivering Log ID: ${job.data.logId}`);
    try {
        const { logId, merchantId, payload } = job.data;
        
        const merchantRes = await pool.query('SELECT webhook_url, webhook_secret FROM merchants WHERE id = $1', [merchantId]);
        if (merchantRes.rows.length === 0) return;
        const { webhook_url, webhook_secret } = merchantRes.rows[0];
        
        const logRes = await pool.query('SELECT attempts FROM webhook_logs WHERE id = $1', [logId]);
        let attempts = logRes.rows[0].attempts + 1;

        const payloadString = JSON.stringify(payload);
        const signature = crypto.createHmac('sha256', webhook_secret).update(payloadString).digest('hex');

        let status = 'pending';
        let responseCode = null;
        let responseBody = null;

        try {
            const response = await axios.post(webhook_url, payload, {
                headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': signature },
                timeout: 5000
            });
            responseCode = response.status;
            responseBody = JSON.stringify(response.data).substring(0, 1000);
            status = 'success';
        } catch (error) {
            responseCode = error.response ? error.response.status : 0;
            responseBody = error.message;
            status = 'pending';
        }

        // --- RETRY LOGIC (TEST MODE AWARE) ---
        let nextRetry = null;
        if (status !== 'success') {
            if (attempts >= 5) {
                status = 'failed';
            } else {
                const isTestRetries = process.env.WEBHOOK_RETRY_INTERVALS_TEST === 'true';
                
                // 5s, 10s, 15s, 20s for TEST. 1m, 5m, 30m, 2h for PROD.
                const delays = isTestRetries 
                    ? [0, 5000, 10000, 15000, 20000] 
                    : [0, 60000, 300000, 1800000, 7200000];
                
                const delay = delays[attempts] || 0;
                
                await webhookQueue.add('deliver-webhook', job.data, { delay });
                const now = new Date();
                nextRetry = new Date(now.getTime() + delay);
            }
        }

        await pool.query(
            `UPDATE webhook_logs 
             SET status = $1, attempts = $2, last_attempt_at = NOW(), 
                 response_code = $3, response_body = $4, next_retry_at = $5
             WHERE id = $6`,
            [status, attempts, responseCode, responseBody, nextRetry, logId]
        );

    } catch (e) {
        console.error(`[WebhookWorker] CRITICAL ERROR:`, e);
    }
}, { connection });

console.log("Worker Service Started...");