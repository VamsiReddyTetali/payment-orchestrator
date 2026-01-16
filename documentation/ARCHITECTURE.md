# Payment Orchestrator Architecture

## Design Philosophy
The project adopts an **Event-Driven Architecture** to decouple request handling from transaction processing. The system is divided into "Producers" (the API) and "Consumers" (the Worker), mimicking architectural patterns used in high-throughput financial systems.

## System Diagram

`mermaid
graph TD
    User[Customer] -->|1. Pays| Checkout[Checkout UI :3001]
    Checkout -->|2. POST Payment| API[API Service :8000]
    
    API -->|3. Create Record (Pending)| DB[(PostgreSQL)]
    API -->|4. Push Job| Redis[(Redis Queue)]
    
    Redis -->|5. Pick up Job| Worker[Worker Service]
    
    Worker -->|6. Simulate Bank Delay| Worker
    Worker -->|7. Update Status| DB
    
    Worker -.->|8. Trigger Webhook| Merchant[Merchant Server]
    
    Dashboard[Dashboard :3000] -->|9. Poll Status| API
`

## Core Components

### 1. API Service (The Producer)
- Validates schemas and authentication for incoming requests.
- Enforces **Idempotency** to prevent duplicate charges.
- Initializes database records with a `pending` status.
- Offloads processing to Redis and immediately returns an acknowledgement to the client to maintain low latency.

### 2. Redis Message Broker
- Functions as the intermediate buffer between the API and the Worker service.
- Manages three distinct queues:
    - `payment-queue`: For transaction processing.
    - `refund-queue`: For processing refunds.
    - `webhook-queue`: For dispatching HTTP notifications.

### 3. Worker Service (The Consumer)
- The core processing engine.
- Consumes jobs sequentially from Redis.
- **Simulation:** Introduces artificial delays (5 seconds) and randomizes success/failure outcomes (80% success rate) to model real-world banking network behavior.
- **Reliability:** Failed webhooks are re-queued for later attempts using an exponential backoff algorithm.

### Test & Evaluation Mode
To comply with automated evaluation requirements, the system supports specific environment variables:

* [cite_start]**TEST_MODE=true**: Forces deterministic behavior in the worker (e.g., fixed delays, specific success rates)[cite: 155].
* **WEBHOOK_RETRY_INTERVALS_TEST=true**: Overrides the standard retry schedule (1m, 5m, 30m) with a rapid schedule (5s, 10s, 15s) to allow full retry cycle testing in under 1 minute.