# Dependency Security

## Assumptions
This review relies on 
pm audit for both the client and server dependency trees.

## Summary
The codebase has multiple identified vulnerabilities in its third-party dependencies, including one High severity issue in the backend's email transporter, and Moderate issues in the frontend routing and build tools. These require major version bumps to resolve.

## Findings

### High: Multiple Vulnerabilities in Nodemailer
- Severity: High
- Confidence: High
- Location: server/package.json (
odemailer <= 9.1.0)
- Evidence: 
pm audit returned: "Nodemailer has SMTP command injection... SSRF in the delivered message... Quadratic time complexity in addressparser"
- Description: The current version of Nodemailer has several known CVEs allowing SMTP command injection, DoS via crafted address lists, and SSRF bypasses. 
- Impact: An attacker could potentially inject malicious SMTP commands or cause a denial of service if they can control the email recipient fields or content.
- Recommendation: Run 
pm install nodemailer@latest (or 
pm audit fix --force) to update to version 10.0.10+.

### Medium: Vulnerabilities in React Router and ESBuild
- Severity: Medium
- Confidence: High
- Location: client/package.json (eact-router-dom, ite)
- Evidence: 
pm audit returned: "React Router: Open redirect via backslash... esbuild enables any website to send any requests to the development server"
- Description: The frontend uses vulnerable versions of eact-router-dom (open redirect) and ite/esbuild (dev server SSRF).
- Impact: Open redirect can be used in phishing attacks. The esbuild vulnerability primarily affects local development environments.
- Recommendation: Run 
pm audit fix --force in the client directory to update ite to v8+ and eact-router-dom to v7+.

## Out of Scope / Deferred
- CI/CD dependency installation checks (Skipped in Phase 0).

## Phase Completion Checklist
- Repository fully indexed for this phase's scope
- Report written to audit-reports/09-dependency-security.md
- All findings follow the Shared Report Standard format
- Assumptions section completed — no silent scope gaps
- audit-reports/AUDIT-PROGRESS.md updated to check off this phase
- Proceeding automatically to the next applicable phase — no confirmation needed
