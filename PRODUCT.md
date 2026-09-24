# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React 18 + Vite, Redux Toolkit, react-router-dom, Tailwind CSS, axios, chart.js, react-toastify, socket.io-client. Backend (separate, later): Node/Express + Mongoose per the TradeX spec. This build ships the complete frontend against a mock data/service layer designed to be swapped for the real API.

## Users

- **Primary: technical recruiters / hiring evaluators.** They land on the demo, scan for craft and trust in under 60 seconds, and form a judgment about final-year-project / real-software-engineering rigor.
- Secondary: viva/defense panel members and fellow students at a demo. The UI must be presentation-friendly and every number must be defensible.

## Product Purpose

TradeX is a production-grade **virtual** stock trading simulator. It exists to prove the builder can ship correct financial math, transactional integrity, real market data, role-based security, and CI/CD — not a tutorial CRUD clone. Success means: a working deployed demo, every displayed financial number verifiable against the transaction ledger, and at least one subsystem (trading engine or real-time pricing) beyond tutorial-level.

## Positioning

Broker-grade rigor without real money: atomic ledger-backed trading, concurrency-safe balances, real FYERS Indian market data with caching and graceful degradation, limit/stop orders resolved by a scheduled job, and live socket price ticks. No real brokerage integration, virtual funds only — stated clearly.

## Operating Context

- Indian market data is primary (FYERS API: NSE/BSE symbols), with a Finnhub/Twelve Data fallback for US symbols. UI supports **both regions, switchable, ₹ default**.
- Demo runs in under 5 minutes via `docker-compose up` with seeded data; live public URL is a hard success criterion.
- Interview defense: the builder must be able to explain and defend every line.

## Capabilities and Constraints

Core modules (confirmed from spec): authentication (JWT + refresh rotation, bcrypt, RBAC, rate-limited login, optional 2FA), stock data (search/filter/sort/paginate, cached live prices, historical candles), trading engine (market/limit/stop orders, pending-order queue, atomic validation), portfolio management (weighted avg price, realized/unrealized P&L, value history, risk score + Sharpe-style metric), watchlist & price-target alerts, leaderboard (daily/weekly/all-time, seasonal archives), real-time socket price ticks, optional AI insights (feature-flagged, degrades gracefully). Admin panel deprioritized. All list endpoints paginated/sortable/filterable.

## Brand Commitments

- Name: **TradeX**.
- Tagline: "A production-grade virtual stock trading simulator built on the MERN stack."
- Virtual-funds-only must be stated clearly in README and UI (compliance clarity).
- No hardcoded secrets/URLs; config-driven environments.

## Evidence on Hand

None yet — empty repo. Future work must not fabricate testimonials, customer counts, benchmarks, or press. Demo data is seeded/simulated and may be labeled as such.

## Product Principles

1. **Trust is the product.** Every financial figure traces to the ledger; nothing is decorative math.
2. **Institutional-grade first impression.** Data density and precision outrank playful expression; this is an Operate surface.
3. **Real-time feels real.** Live ticks, streaming portfolio value, market-hours awareness.
4. **Graceful degradation everywhere.** External API down, AI flag off, socket dropped — the app never lies or breaks.
5. **Defensible line-by-line.** If it can't be explained in an interview, it doesn't ship.

## Accessibility &Inclusion

No product-specific standard established yet; default to strong web practice (contrast, keyboard nav, reduced motion) as befits an engineering-rigor showcase.
