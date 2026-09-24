# Database Security

## Assumptions
This review assumes the database is hosted on MongoDB Atlas M0 (as evidenced by earlier configuration tasks). The database network boundaries (IP whitelisting, Atlas security) are assumed to be managed correctly by the provider. Review is restricted to the ORM and schema design layer.

## Summary
The application connects to MongoDB using Mongoose. Access control is enforced strictly at the application layer using eq.user._id, as MongoDB does not have native Row-Level Security (RLS) for application users. NoSQL injection is mitigated by the global sanitizer. Schema integrity is robust with appropriate unique indexes and constraints.

## Findings
No verified evidence found for NoSQL injection vulnerabilities, missing critical indexes, or schema validation weaknesses.

### Good Practice: Strict Application-Layer Isolation
- Severity: Low (Informational)
- Confidence: High
- Location: server/src/models/*.js, server/src/controllers/*.js
- Evidence: Mongoose schemas enforce types, and controllers always scope queries using eq.user._id.
- Description: Since the database does not use RLS, the application effectively isolates data by never trusting client input for user IDs.
- Impact: Users cannot cross tenant boundaries.
- Recommendation: N/A.

### Informational: Lack of Encryption at Rest for PII
- Severity: Low
- Confidence: High
- Location: server/src/models/User.js
- Evidence: The 
ame and email fields are stored in plaintext.
- Description: While passwords are mathematically hashed with bcrypt, personal data like emails and names are not encrypted at the application layer. MongoDB Atlas encrypts data at rest at the volume layer, which typically suffices for standard compliance, but it does not protect against a full database dump.
- Impact: If the database is compromised, user emails and names are exposed.
- Recommendation: For higher security, consider application-level encryption for the email field using standard AES wrappers before DB insertion.

## Out of Scope / Deferred
- MongoDB Atlas network configuration (Cloud security skipped).
- Query performance (deferred to Phase 12).

## Phase Completion Checklist
- Repository fully indexed for this phase's scope
- Report written to audit-reports/05-database-security.md
- All findings follow the Shared Report Standard format
- Assumptions section completed — no silent scope gaps
- audit-reports/AUDIT-PROGRESS.md updated to check off this phase
- Proceeding automatically to the next applicable phase — no confirmation needed
