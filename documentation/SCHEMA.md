# Payment Orchestrator Database Schema

The database utilizes a normalized relational schema within PostgreSQL to ensure data integrity and ACID compliance.

## Entity Relationships

`mermaid
erDiagram
    MERCHANTS ||--o{ ORDERS : creates
    ORDERS ||--o{ PAYMENTS : contains
    PAYMENTS ||--o{ REFUNDS : has
    MERCHANTS ||--o{ WEBHOOK_LOGS : owns

    PAYMENTS {
        varchar id PK
        varchar order_id FK
        varchar status "pending | success | failed"
        int amount
        boolean captured "DEFAULT false"
        timestamp created_at
    }
    
    REFUNDS {
        varchar id PK
        int amount
        varchar status
    }
`

## Tables Breakdown

### 1. Merchants
Stores authentication credentials and configuration settings.
` Column ` Type ` Notes `
`--------`------`-------`
` id ` UUID ` Primary Key `
` api_key ` VARCHAR ` Public Key for client-side integration `
` api_secret ` VARCHAR ` Private Key for server-side requests `
` webhook_url ` TEXT ` Endpoint for event notifications `

### 2. Orders & Payments
Core transaction data entities.
- **Orders:** Represents the *intent* to transact (e.g., "Customer intends to pay ₹500").
- **Payments:** Represents the actual financial processing attempt.
- *Note:* All monetary values are stored in **paise** (integers) to avoid floating-point errors inherent in decimal arithmetic (e.g., ₹500.00 is stored as `50000`).

### 3. Webhook Logs
Audit trail for debugging and delivery verification.
` Column ` Type ` Notes `
`--------`------`-------`
` event ` VARCHAR ` Event type, e.g., `payment.success` `
` attempts ` INT ` Count of delivery retries `
` response_code ` INT ` HTTP status received from merchant server `