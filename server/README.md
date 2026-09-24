# TradeX Backend API

Production-grade Node.js + Express REST API for a virtual stock trading simulator, backed by MongoDB.

## Features & Architecture
- **Atomic Trading Engine**: Secure, concurrency-safe market-order execution utilizing MongoDB Transactions and optimistic locking. All trades result in an immutable ledger `Transaction`.
- **Authentication & RBAC**: JWT-based auth with opaque refresh token rotation and role-based access control. Features a complete **email verification flow** utilizing Nodemailer and Google SMTP.
- **Resilient Integrations**: Adapter pattern for Market Data Provider (`finnhub` -> `yahoo` -> `mock`). Default is Finnhub.
- **Idempotency**: Requests support `Idempotency-Key` headers via sparse unique indexes.

## Prerequisites

- Node.js v18+
- **MongoDB v6+ configured as a Replica Set**. Transactions *will* fail with a "Transaction numbers are only allowed on a replica set member" error on standalone mongod instances. 
  - Recipe: `mongod --replSet rs0`, then run `rs.initiate()` in the mongo shell. (Note: TradeX is currently configured to connect to MongoDB Atlas).

## Setup 

1. Install dependencies: `npm install`
2. `cp .env.example .env` and configure it. Ensure your MongoDB URI and Finnhub API keys are set.
3. Configure `SMTP_USER` and `SMTP_PASS` for email verification flows. (Use a Google App Password).

*Note on Market Data (Finnhub)*: 
- **Live Data**: We utilize Finnhub for real live market data. 
- **Realtime Ticks**: Finnhub websocket streams or polling mechanisms are used to bring live data directly to the client.

## Testing

The project uses Jest and `mongodb-memory-server` which spins up an ephemeral replica set.
```bash
npm test
```
To run the integration smoke test against the running application:
```bash
npm run smoke
```

See the `docs/` directory for detailed ERD, Architecture, and Flow documentation.
