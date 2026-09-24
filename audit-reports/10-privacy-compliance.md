# Privacy & Compliance

## Assumptions
This is a lightweight review appropriate for a portfolio project, not a formal legal audit. It assumes that third-party infrastructure providers (Vercel, Render, MongoDB Atlas) log IP addresses by default at their edge/network layers.

## Summary
TradeX collects a minimal amount of personal data (
ame, email, and IP address), which is appropriate for a simulated trading platform requiring authentication and email verification. However, there is no Privacy Policy or Terms of Service present, and no mechanism for a user to self-delete their account. Server logs capture user IPs, and third-party vendors inevitably process metadata.

## Findings

### Medium: Missing Privacy Policy and Account Deletion
- Severity: Medium
- Confidence: High
- Location: Entire application
- Evidence: No privacy.md, /privacy route, or account deletion endpoint found in the codebase.
- Description: The application stores users' names and emails. By default, users have no way to delete this data, and there is no published policy explaining how this data is used, who it is shared with (e.g. SMTP providers, database hosts), or how long it is retained.
- Impact: Non-compliance with basic privacy expectations (like GDPR's Right to Erasure), even for a hobby project.
- Recommendation: Add a simple Privacy Policy on the frontend explaining that this is a simulator and data is only used for login. Implement a DELETE /api/v1/auth/me endpoint to allow users to purge their accounts and associated trading history.

### Low: IP Addresses in Server Logs
- Severity: Low
- Confidence: High
- Location: server/src/middleware/requestLogger.js
- Evidence: logger.log(level, ..., { ip: req.ip })
- Description: The application actively logs the IP address of every request. Under GDPR, IP addresses are considered personal data.
- Impact: Increased privacy footprint in standard server logs.
- Recommendation: For a portfolio project, this is acceptable, but consider truncating or hashing IPs if logs are retained long-term.

## Out of Scope / Deferred
- Security of stored PII (completed in Phase 5).

## Phase Completion Checklist
- Repository fully indexed for this phase's scope
- Report written to audit-reports/10-privacy-compliance.md
- All findings follow the Shared Report Standard format
- Assumptions section completed — no silent scope gaps
- audit-reports/AUDIT-PROGRESS.md updated to check off this phase
- Proceeding automatically to the next applicable phase — no confirmation needed
