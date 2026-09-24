# Entity Relationship Diagram

- **User**: Name, Email, Hash, Role.
- **Portfolio**: 1-to-1 with User. Holds `cashBalance`, `holdings` array, and `version` (for optimistic locking).
- **Transaction**: Immutable ledger entry representing trades. Includes `fee` and `value`.
- **Order**: Working limit or stop orders.
- **Watchlist**: Array of symbols the user monitors, plus price alerts.
- **AuditLog**: Immutable system logs.
- **Stock**: The tradable universe.
- **Leaderboard**: Global rankings.
