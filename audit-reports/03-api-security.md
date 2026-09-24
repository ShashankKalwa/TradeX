# API Security

## Assumptions
This review assumes that express-validator behaves correctly when configured and that the sanitize middleware correctly recurses through JSON bodies to strip MongoDB operators.

## Summary
API security is strictly enforced across all REST endpoints. The application uses express-validator to explicitly whitelist and validate all expected incoming fields. MongoDB injection is mitigated globally by a custom object sanitizer. Error handling strips internal stack traces from client responses in production.

## Findings
No verified evidence found for API endpoint vulnerabilities, SQL/NoSQL injections, or CORS misconfigurations.

### Good Practice: Express-Validator Whitelisting
- Severity: Low (Informational)
- Confidence: High
- Location: server/src/routes/*.js (e.g. uthRoutes.js, 	radingRoutes.js)
- Evidence: alidate([body('email').isEmail().normalizeEmail(), body('password').notEmpty()])
- Description: Every POST/PUT endpoint uses explicit express-validator chains. Fields that are not explicitly read by the controllers are ignored, mitigating mass assignment risks.
- Impact: Clients cannot inject unexpected properties like { "role": "admin" }.
- Recommendation: Maintain this pattern.

### Good Practice: Global MongoDB Sanitization
- Severity: Low (Informational)
- Confidence: High
- Location: server/src/middleware/sanitize.js
- Evidence: if (FORBIDDEN.test(key)) continue; (where FORBIDDEN = /^\$|\./)
- Description: A global middleware intercepts all JSON bodies and URL parameters, recursively stripping keys starting with $ or ..
- Impact: Prevents NoSQL injection attacks where attackers pass objects like { "": "" } to bypass filters.
- Recommendation: N/A.

### Good Practice: Secure Error Handling
- Severity: Low (Informational)
- Confidence: High
- Location: server/src/middleware/errorHandler.js
- Evidence: message: statusCode >= 500 && isProduction ? 'Internal Server Error' : error.message
- Description: Stack traces and internal error details are logged to the console but stripped from the JSON response if NODE_ENV=production.
- Impact: Internal paths and schema details cannot be leaked via forced errors.
- Recommendation: N/A.

## Out of Scope / Deferred
- Rate limiting thresholds and DoS (deferred to Phase 12).
- Authorization logic (completed in Phase 2).

## Phase Completion Checklist
- Repository fully indexed for this phase's scope
- Report written to audit-reports/03-api-security.md
- All findings follow the Shared Report Standard format
- Assumptions section completed — no silent scope gaps
- audit-reports/AUDIT-PROGRESS.md updated to check off this phase
- Proceeding automatically to the next applicable phase — no confirmation needed
