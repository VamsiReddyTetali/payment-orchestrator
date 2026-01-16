# Payment Orchestrator API Reference

**Base URL:** `http://localhost:8000/api/v1`

## Authentication
All protected endpoints require the following headers:
- `X-Api-Key`
- `X-Api-Secret`

## 1. Orders
**POST** `/orders`
Creates a new payment session.

`json
{
  "amount": 50000,
  "currency": "INR",
  "receipt": "order_rcpt_1"
}
`

## 2. Payments (Public)
**POST** `/payments/public`
Utilized by the Checkout UI to initiate the asynchronous payment process.

`json
{
  "order_id": "order_123",
  "method": "upi",
  "vpa": "user@bank"
}
`
*Returns:* `202 Accepted` (Processing initiated in background).

## 3. Refunds
**POST** `/payments/:id/refunds`
Initiates a refund for a successful payment.

`json
{
  "amount": 5000,   // Partial refund of ₹50.00
  "reason": "Product defect"
}
`

## 4. System Health
**GET** `/health`
Diagnostic endpoint to verify database and Redis connectivity.
*Response:* `{ "status": "healthy", "database": "connected", "redis": "connected" }`