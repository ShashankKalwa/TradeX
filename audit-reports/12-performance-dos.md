# Performance & DoS

## Assumptions
This review assumes the underlying MongoDB Atlas instance and network load balancers (Vercel/Render) provide baseline DDoS protection, and focuses purely on application-layer resource exhaustion.

## Summary
The application is well-defended against basic application-layer DoS. Rate limiting is enforced contextually (auth, trades, general API). External API calls explicitly configure timeouts. Database queries returning collections are strictly paginated. The payload limit is globally capped at a conservative 100kb, preventing memory exhaustion via massive JSON bodies.

## Findings
No verified evidence found for algorithmic complexity vulnerabilities, unbounded queries, or missing external timeouts.

### Good Practice: Strict Payload and Pagination Limits
- Severity: Low (Informational)
- Confidence: High
- Location: server/src/app.js, server/src/controllers/tradingController.js
- Evidence: pp.use(express.json({ limit: '100kb' })); and parsePagination(req.query)
- Description: The server outright drops requests with bodies over 100kb, which makes payload-based memory exhaustion attacks very difficult. Endpoints returning lists, such as the transaction ledger and order history, are strictly paginated using limit and skip.
- Impact: Protects the Node.js event loop and garbage collector from excessive allocations, and prevents MongoDB from exhausting cursors or memory.
- Recommendation: N/A.

### Good Practice: External Request Timeouts
- Severity: Low (Informational)
- Confidence: High
- Location: server/src/integrations/providers/finnhubProvider.js
- Evidence: xios.create({ timeout: marketData.timeoutMs })
- Description: Axios instances explicitly set timeouts (defaulting to 5000ms per .env.example).
- Impact: If the third-party market data provider hangs, the Node.js server will not leak sockets or freeze waiting for a response indefinitely.
- Recommendation: N/A.

## Out of Scope / Deferred
- Caching logic efficiency (not fully reviewed as 
ode-cache inherently expires keys, mitigating memory leaks).

## Suggested Dynamic Tests (Staging Only)
- Slowloris attacks against the web server.
- High-concurrency load testing (e.g., using rtillery or k6) targeting the /api/v1/trade/market endpoint to verify rate limits trigger appropriately and connection pools don't exhaust under peak simulated burst traffic.

## Phase Completion Checklist
- Repository fully indexed for this phase's scope
- Report written to audit-reports/12-performance-dos.md
- All findings follow the Shared Report Standard format
- Assumptions section completed — no silent scope gaps
- audit-reports/AUDIT-PROGRESS.md updated to check off this phase
- Proceeding automatically to the next applicable phase — no confirmation needed
