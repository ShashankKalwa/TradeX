# Architecture

TradeX is structured in a classic layered architecture (Routes -> Controllers -> Services) with a strict separation of concerns.

## 1. Services
All business logic lives in the `src/services/` directory. 
- `tradingEngineService`: Manages atomic trade execution with optimistic locking.
- `authService`: Handles JWT logic, passwords, and 2FA.

## 2. Controllers
Controllers (`src/controllers/`) are thin wrappers that extract data from `req` and pass it to services, then format the result into the `{ success: true, data }` envelope.

## 3. Data Integration
`marketDataProvider.js` acts as an adapter that can switch between a mock provider, Finnhub, and FYERS. Prices are cached briefly to avoid rate limits.

## 4. Background Jobs
Cron jobs (`src/jobs/`) handle resting orders and leaderboards. They do not run during tests unless explicitly started.
