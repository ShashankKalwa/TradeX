# Threat Model
## Assumptions
Assuming standard access to the local codebase. Third-party managed services (Vercel, Render, MongoDB Atlas) are assumed to have their own underlying infrastructure security managed by the provider.

## System Overview
TradeX is a virtual stock trading simulator.
- **Frontend**: React 18, Vite, Redux Toolkit, Tailwind.
- **Backend**: Node.js, Express, Socket.io.
- **Database**: MongoDB (Mongoose ORM).
- **External Services**: Finnhub/Yahoo Finance (market data), Nodemailer (SMTP).
- **Hosting Targets**: Vercel (Frontend), Render (Backend), MongoDB Atlas (DB).

## Trust Boundaries
1. **Client (Browser) -> Backend API**: Data crossing from untrusted client to backend HTTP/WebSocket endpoints.
2. **Backend API -> Database**: Data crossing from application logic to MongoDB Atlas via connection string.
3. **Backend API -> External Providers**: Requests sent to Finnhub and Yahoo Finance for live data.

## Assets
- **User Accounts & Credentials**: High sensitivity. Passwords, JWT tokens, email addresses.
- **Virtual Portfolios**: High business sensitivity (integrity is core to the application's purpose). Ledger balances, transaction histories, and holdings.
- **System Secrets**: Critical sensitivity. MongoDB URI, Finnhub API Key, SMTP passwords, JWT secrets.

## Attacker Profiles
- **Anonymous Public User**: Can attack public endpoints, attempt DoS, or probe for unauthenticated vulnerabilities.
- **Authenticated User**: Can attempt IDOR (Insecure Direct Object Reference) to access other users' portfolios or manipulate trading logic (race conditions, negative values).
- **Automated Bot/Scraper**: May attempt to hammer the market data endpoints or leaderboard, risking rate limits and DoS.
- **Malicious Insider**: Not heavily considered for a solo/portfolio project, but backend admin accounts possess broad access.

## Entry Points
- REST API routes (/api/v1/auth, /api/v1/trade, /api/v1/portfolio, /api/v1/market, /api/v1/watchlist, /api/v1/admin, /api/v1/leaderboard)
- WebSocket connections (/socket.io)

## Critical Data Flows
- **Order Placement**: Client sends order (symbol, qty, type) -> Auth Middleware -> Trade Controller -> Order Validation (balance/holdings check) -> Transaction Ledger Insert -> Portfolio Update.
- **Authentication**: Client sends email/password -> Auth Controller -> BCrypt Hash Check -> JWT Sign -> Response with HttpOnly Cookie/Token.

## Attack Surface Summary
The highest risk areas are the business logic of the trading engine (preventing race conditions or ledger manipulation) and authorization (ensuring users can only view/trade their own accounts). Secondary risks include rate limiting (preventing DoS) and secret exposure.

## Phase Applicability Decisions
- AI/LLM Security: Skipped — No LLM or AI APIs are imported or used in this project.
- Cloud Security: Skipped — Deployed to managed PaaS (Vercel/Render/Atlas) with no custom IaC or complex VPCs.
- DevOps Security: Skipped — No CI/CD pipeline files (e.g. GitHub Actions) found in the repository.

## Phase Completion Checklist
- Repository fully indexed for this phase's scope
- Report written to audit-reports/00-threat-model.md
- All findings follow the Shared Report Standard format
- Assumptions section completed — no silent scope gaps
- audit-reports/AUDIT-PROGRESS.md updated to check off this phase
- Proceeding automatically to the next applicable phase — no confirmation needed
