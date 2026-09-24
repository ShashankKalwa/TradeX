# High Issues

- **[FIX-1] Multiple Vulnerabilities in Nodemailer (Phase 9)**
  - Confidence: High
  - Description: The 
odemailer dependency has several high-severity CVEs (SMTP injection, SSRF, DoS).
  - Remediation: Update to 
odemailer@10.0.10+.
- **[FIX-2] Full Account Takeover via XSS / JWT in LocalStorage (Phase 7, 16)**
  - Confidence: High
  - Description: JWT is stored in localStorage, making it trivially extractable via any future XSS vulnerability.
  - Remediation: Refactor authentication to issue and consume HttpOnly, Secure, SameSite=Strict cookies.
