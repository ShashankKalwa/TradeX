# System Flows

## Trade Execution Flow
1. Client `POST /api/v1/trade/market`
2. Auth middleware verifies JWT.
3. `tradingEngineService.executeMarketOrder` is called.
4. Service locks the current quote from `marketDataProvider`.
5. Transaction begins (`mongoose.startSession`).
6. `Portfolio` is fetched. If insufficient funds, it throws.
7. Cash is deducted, `holdings` updated.
8. `Transaction` and `AuditLog` are created.
9. Transaction commits. If `VersionError`, it retries.
10. Success returned to user.
