# Frontend Security

## Assumptions
This review assumes the client is built via Vite and deployed statically. The review relies on static analysis of the React codebase for unsafe DOM injection and insecure storage patterns.

## Summary
The frontend is built securely using modern React, which inherently mitigates most XSS risks by escaping text nodes. No instances of dangerouslySetInnerHTML were found in the application. However, the JWT authentication token is stored in the browser's localStorage, which is a known pattern that exposes the token to potential extraction if an XSS vulnerability were ever introduced by a future dependency or feature.

## Findings

### Medium: JWT stored in localStorage
- Severity: Medium
- Confidence: High
- Location: client/src/app/sessionSlice.js, lines 24 and 45
- Evidence: localStorage.setItem('tradex.session', JSON.stringify(res))
- Description: The access token returned by the server is saved directly into localStorage. Any JavaScript running on the domain (including third-party scripts) can read localStorage.
- Impact: If an XSS vulnerability is introduced in the future, attackers can easily extract the user's JWT and hijack their session.
- Recommendation: Migrate the authentication flow to use HttpOnly, Secure, SameSite cookies issued by the backend instead of storing the token in JavaScript-accessible storage.

## Out of Scope / Deferred
- CSRF protection (N/A since the app currently uses Bearer tokens in headers, not cookies).
- Server-side validation (completed in Phase 3).

## Phase Completion Checklist
- Repository fully indexed for this phase's scope
- Report written to audit-reports/07-frontend-security.md
- All findings follow the Shared Report Standard format
- Assumptions section completed — no silent scope gaps
- audit-reports/AUDIT-PROGRESS.md updated to check off this phase
- Proceeding automatically to the next applicable phase — no confirmation needed
