# TradeX

**A production-grade virtual stock trading simulator.** Virtual funds only — no real money, no brokerage, no order ever leaves this app.

TradeX is a complete full-stack trading desk you can actually audit: every balance, holding, and P&L figure on screen is *derived* from an append-only transaction ledger rather than stored alongside it. Place an order, and the fill is stamped, written once, and reconcilable line by line.

---

## What is in this repository

| Path | State | Notes |
|---|---|---|
| [`client/`](client/) | **Built** | React 18 + Vite + Redux Toolkit + Tailwind. Complete trading desk UI across 9 surfaces. |
| [`server/`](server/) | **Built** | Node.js + Express REST API backed by MongoDB. Complete auth, email verification, and trading engine. |
| `docs/` | **Roadmap** | Architecture write-up for a portfolio page. |

The client runs against the real Node.js backend. The backend is connected to **Finnhub** for live market data and uses **Nodemailer** for full email verification flows.

---

## Run it locally

1. **Install Dependencies**
```bash
git clone <your-repo> && cd TradeX
# Install client dependencies
cd client && npm install
# Install server dependencies
cd ../server && npm install
```

2. **Configure Environment**
Duplicate `.env.example` to `.env` in the `server/` directory and fill in your keys:
- `MONGO_URI`: Your MongoDB connection string (e.g., MongoDB Atlas).
- `SMTP_USER` / `SMTP_PASS`: For email verification emails (e.g., Google App Password).
- `MARKET_DATA_PROVIDER`: Defaults to `auto` (uses free Yahoo Finance data). Set to `mock` for a fast-moving, simulated market.
- `FINNHUB_API_KEY`: (Optional) Free API key from Finnhub for alternative live data.
- `RENDER_EXTERNAL_URL`: (Optional) If deploying to Render, set this to your app's URL to enable the automatic keep-alive pings.

3. **Seed Demo Data**
To get started with an initial set of 17 tradable stocks, a populated leaderboard, and demo accounts (including a Platform Admin at `admin@tradex.local` with password `Passw0rdDemo`), run the seed script:
```bash
cd server
npm run seed
```

4. **Start the applications**
In terminal 1 (Server):
```bash
cd server
npm run dev
```

In terminal 2 (Client):
```bash
cd client
npm run dev
```

Sign in with any email and a password of 6+ characters, then check your email inbox to verify your account and start trading!

---

## Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │  client/  (React 18 + Vite + Redux Toolkit)  │
                    │                                              │
   ┌────────────────┼───────────────────────────────────────────┐  │
   │  Desk chrome   │  <AppShell>  ticker tape · nav · status   │  │
   │  (ink #191713) │                                           │  │
   └────────────────┴───────────────────────────────────────────┘  │
          │                    │                     │
          ▼                    ▼                     ▼
   ┌─────────────┐   ┌─────────────────┐   ┌──────────────────┐
   │ pages/      │   │ components/     │   │ app/ (Redux)     │
   │ Blotter     │   │ OrderTicket     │   │ sessionSlice     │
   │ Markets     │   │ charts (SVG)    │   │ marketSlice      │
   │ Portfolio   │   │ primitives      │   │ bookSlice        │
   │ Orders      │   │ Icon (authored) │   │  + listener mw   │
   │ Ledger      │   └─────────────────┘   └────────┬─────────┘
   │ Watchlist   │                                  │
   │ Leaderboard │                                  ▼
   └─────────────┘                        ┌────────────────────┐
                                          │ services/api.js    │
                                          │  ← THE SEAM →      │
                                          └─────────┬──────────┘
                    ┌───────────────────────────────┴───────────────┐
                    ▼                       ▼                       ▼
          ┌──────────────────┐   ┌────────────────────┐   ┌──────────────────┐
          │ server/          │   │ Node + Express     │   │ MongoDB          │
          │ Finnhub Live Feed│   │ THE LEDGER         │   │ Atomic Engine    │
          │ Polling ticks    │   │ append-only trades │   └──────────────────┘
          └──────────────────┘   │ cash re-derives    │
                                 │ avg cost, P&L      │
                                 └────────────────────┘
                                          ▲
                                          │  sweep every 8s
                                 ┌────────┴─────────┐
                                 │ order scheduler  │  ← node-cron on the server
                                 │ limit / stop     │
                                 └──────────────────┘
```

### The engine is the product

The `server/` trading engine is the single source of truth. Nothing stores a balance statically.

- **`deriveCash(transactions)`** — cash is the sum of every ledger entry, recomputed, never mutated.
- **`deriveHoldings(transactions)`** — weighted-average cost basis built by replaying buys and sells.
- **`deriveRealized(transactions)`** — realized P&L from closed lots plus dividends.
- **`valuate(holdings, cash, quotes)`** — market value, day change, unrealized P&L against the live feed.

If a number appears on screen and you cannot find the ledger entries that produced it, that is a bug.

### Security posture

- Credentials are encrypted on the backend (bcrypt) and authenticated via JWT cookies/tokens.
- Features a strict email verification pipeline for real trades. Unverified users are sandboxed in "explore" mode.
- Market data is fetched live from Finnhub.

The footer states *virtual funds only* on every screen, by design.

---

## The interface

The visual world is **The Floor Blotter** — the open-outcry trading desk: a lamp-lit ink-black desk, warm paper data panels, ruled ledger rows, perforated order tickets and rubber-stamp fills. It deliberately refuses the category's default dark-neon terminal.

- **Ticker tape** across the top is the always-running quotation board.
- **The blotter** leads with one monumental net-value figure, then holdings as ruled rows.
- **Order ticket** is a real perforated form; placing an order gets it *stamped* — oxblood for sells, ledger green for buys — with the ledger entry ID printed on the slip.
- **Rejections** print as a rejection slip that names the problem and the recovery.

---

*TradeX is an educational simulator. It is not investment advice, it does not connect to a broker, and no real money can enter or leave it.*
