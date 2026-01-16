# Payment Orchestrator

## 🚀 Project Overview
Welcome to the Payment Orchestrator. This project is a fully functional **Full-Stack Payment Gateway** engineered to mimic the core architecture of major payment processors like Razorpay or Stripe.

The primary objective was to move beyond standard CRUD applications and implement a system that handles **concurrency, asynchronous background processing, and webhooks**. It addresses the challenges of distributed systems, ensuring data consistency between the merchant dashboard and customer checkout sessions.

The system allows merchants to onboard, accept payments via a secure checkout interface, and track transaction lifecycles in real-time. It simulates network latency and bank failures to demonstrate system resilience.

## 🛠 Tech Stack (PERN + Redis)
The project utilizes a microservices-inspired architecture:
- **Database:** PostgreSQL 15 (Dockerized)
- **Backend:** Node.js + Express
- **Queue & Caching:** Redis 7 + BullMQ
- **Frontend:** React + Vite + TailwindCSS
- **Infrastructure:** Docker & Docker Compose

## ✨ Key Features
- **Merchant Dashboard:** A secure portal for merchants to view analytics, monitor transaction history, and generate API credentials.
- **Hosted Checkout Page:** An isolated micro-frontend for secure customer payments via UPI or Credit Card (featuring Luhn validation).
- **Async Payment Engine:** High-volume transaction processing is managed via a Redis job queue. A dedicated worker service processes payments in the background to maintain API throughput.
- **Resilient Webhooks:** An automated notification system updates merchants on payment status. It implements an exponential backoff strategy (retrying up to 5 times) to handle delivery failures.
- **Refund System:** Supports partial and full refunds with server-side validation to ensure ledger accuracy.
- **Idempotency:** Implements idempotency keys to prevent duplicate processing of the same transaction request.

## ⚡ How to Run It
The entire application stack is containerized.

1. **Clone the repository:**
   `bash
   git clone https://github.com/VamsiReddyTetali/payment-orchestrator
   cd payment-orchestrator
   `

2. **Start the services:**
   `bash
   docker-compose up -d --build
   `
   *Note: Please allow approximately 30 seconds for the database to initialize and seed default data.*

3. **Verify Status:**
   Ensure the following 6 containers are active: `api`, `worker`, `db`, `redis`, `dashboard`, and `checkout`.

## 🌐 Services Map
` Service ` URL ` Description `
`---------`-----`-------------`
` **Backend API** ` `http://localhost:8000` ` The core REST API handling business logic. `
` **Merchant Dashboard** ` `http://localhost:3000` ` Administration interface for merchants. `
` **Customer Checkout** ` `http://localhost:3001` ` The client-facing payment interface. `

## 🧪 Quick Test Flow
To verify the system functionality:

1.  **Access the Dashboard** at `http://localhost:3000` using default credentials:
    * Email: `test@example.com`
    * Secret: `secret_test_xyz789`
2.  **Generate an Order** via terminal:
    `bash
    curl -X POST http://localhost:8000/api/v1/orders \
      -H "Content-Type: application/json" \
      -H "X-Api-Key: key_test_abc123" \
      -H "X-Api-Secret: secret_test_xyz789" \
      -d '{"amount": 50000, "currency": "INR", "receipt": "demo_1"}'
    `
3.  **Process Payment:** Copy the `id` from the response and navigate to:
    `http://localhost:3001/checkout?order_id=YOUR_ORDER_ID`
4.  **Verify Results:** Complete the payment using UPI (`test@upi`). The transaction status will update automatically on the Dashboard.