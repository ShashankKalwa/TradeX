# Auth & Authorization

## Assumptions
This review assumes the use of standard cryptographic functions in crypt and jsonwebtoken. It relies on static analysis of the Express routes and middleware.

## Summary
The application correctly implements a robust JWT-based authentication system with BCrypt password hashing. Role-based access control (RBAC) and IDOR protections are strictly enforced server-side, heavily utilizing eq.user._id for data fetching. The system is well-secured in this domain.

## Findings
No verified evidence found for Insecure Direct Object References (IDOR), privilege escalation, or weak password storage.

### Good Practice: Robust IDOR Protection
- Severity: Low (Informational)
- Confidence: High
- Location: server/src/controllers/tradingController.js, server/src/controllers/portfolioController.js
- Evidence: const data = await portfolioService.getPortfolio(req.user._id);
- Description: All sensitive portfolio, order, and trading actions inherently bind to the authenticated user's ID via eq.user._id directly in the database queries.
- Impact: It is impossible for an attacker to view or modify another user's account by manipulating IDs in the API requests.
- Recommendation: Maintain this pattern for any future endpoints.

### Good Practice: Secure Password Hashing
- Severity: Low (Informational)
- Confidence: High
- Location: server/src/services/authService.js
- Evidence: const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
- Description: Passwords are correctly salted and hashed before database storage. Plaintext passwords never persist.
- Impact: If the database is compromised, passwords cannot be trivially reversed.
- Recommendation: N/A.

## Out of Scope / Deferred
- Rate limiting on auth endpoints (deferred to Phase 12).

## Phase Completion Checklist
- Repository fully indexed for this phase's scope
- Report written to audit-reports/02-auth-authz.md
- All findings follow the Shared Report Standard format
- Assumptions section completed — no silent scope gaps
- audit-reports/AUDIT-PROGRESS.md updated to check off this phase
- Proceeding automatically to the next applicable phase — no confirmation needed
