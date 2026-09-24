# Backend Security

## Assumptions
This review assumes that the dependencies used for network fetching (xios) behave according to their standard security profiles, and that the Node.js runtime is reasonably up to date.

## Summary
The backend surface area is extremely narrow by design. There are no file uploads, no endpoints that accept user-provided URLs for fetching (no SSRF vectors), and no system command execution (exec, spawn) anywhere in the application. Request logging is sanitized by design, logging only HTTP metadata and never request bodies.

## Findings
No verified evidence found for SSRF, file upload vulnerabilities, command injection, or sensitive data logging.

### Good Practice: Minimal Attack Surface
- Severity: Low (Informational)
- Confidence: High
- Location: Entire backend
- Evidence: grep search for multer, exec, spawn, eval, and xios usage.
- Description: The application does not implement risky features like file uploads or URL proxying. External API calls (via xios) only fetch data from hardcoded vendor endpoints (Finnhub, Yahoo) or internal URLs (process.env.RENDER_EXTERNAL_URL). 
- Impact: Eliminates entire classes of vulnerabilities (Path Traversal, RCE via upload, SSRF).
- Recommendation: N/A.

### Good Practice: Safe Request Logging
- Severity: Low (Informational)
- Confidence: High
- Location: server/src/middleware/requestLogger.js
- Evidence: logger.log(level, ..., { requestId, method, path, status, durationMs, userId, ip })
- Description: The request logger explicitly logs predefined metadata fields rather than dumping the entire eq or eq.body object.
- Impact: Prevents accidental logging of plaintext passwords, JWTs, or PII submitted in JSON bodies.
- Recommendation: N/A.

## Out of Scope / Deferred
- API validation logic (completed in Phase 3).
- Authorization checks (completed in Phase 2).

## Phase Completion Checklist
- Repository fully indexed for this phase's scope
- Report written to audit-reports/08-backend-security.md
- All findings follow the Shared Report Standard format
- Assumptions section completed — no silent scope gaps
- audit-reports/AUDIT-PROGRESS.md updated to check off this phase
- Proceeding automatically to the next applicable phase — no confirmation needed
