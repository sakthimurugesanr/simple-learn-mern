# Security implementation and release requirements

Report vulnerabilities privately to the store's configured security contact. A public contact has not been configured for this starter.

## OWASP Top 10 mapping

| Risk                          | Implemented control                                                                                                                                              | Operational caveat                                                                           |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| A01 Broken access control     | Server permission middleware, fresh DB permissions, admin-only identity tools, owned addresses/cart/wishlist/orders, supervisor uploader checks                  | Independent IDOR and permission-bypass testing remains required                              |
| A02 Cryptographic failures    | argon2id hashes; random opaque refresh/reset/verification tokens stored as SHA-256; JWT algorithm/issuer/audience pinning; secure production cookies             | Supply secrets through a secret manager; TLS and encrypted backups are infrastructure duties |
| A03 Injection                 | Shared zod schemas; parameterized Prisma queries and tagged raw SQL; allowlisted product fields; sanitized rich text; CSV formula neutralization                 | New endpoints must preserve these boundaries                                                 |
| A04 Insecure design           | Integer prices, DB integrity constraints, stock row locking, order idempotency, order transition graph                                                           | Commerce workflows and refunds still need business acceptance testing                        |
| A05 Security misconfiguration | Validated env, origin checks, CORS, Helmet, nonce web CSP, body limits, disabled server banner                                                                   | Review proxy trust, production hosts and storage policy                                      |
| A06 Vulnerable components     | Lockfile, Dependabot, audit/CodeQL/Trivy/gitleaks workflows                                                                                                      | Scans are configured, not evidence of a clean audit                                          |
| A07 Identification failures   | Verified email login, short access tokens, refresh rotation/reuse family revocation, session checks, lockout, reset token atomic consumption, session logout-all | Optional admin TOTP is not implemented; protect admin access at the edge until reviewed      |
| A08 Integrity failures        | Immutable audit trigger, transactional audit writes on administrative mutations, pinned migration files, protected deployment environment guidance               | Configure GitHub branch protection and environment reviewers                                 |
| A09 Logging failures          | Pino structured logs, request IDs, PII/credential redaction, audit actor/time/IP/snapshots, generic production errors                                            | Set retention, alerting and restricted log access; audit snapshots contain business data     |
| A10 SSRF                      | No arbitrary remote image fetching in upload endpoint; incoming bytes re-encoded before S3 upload                                                                | Allowlisted next/image hosts must remain controlled; banner images must use these hosts      |

## Authentication and CSRF

Access tokens remain in application memory; refresh cookies are HTTP-only, SameSite=Strict, Secure in production. Mutation requests require the exact configured `WEB_URL` Origin. Keep the API behind the same public origin and terminate HTTPS at a trusted proxy. Requests from scripts must explicitly supply that Origin. All private routes check the user is active and the associated session is unexpired/unrevoked. Resetting passwords or suspending users revokes sessions.

Refresh reuse revokes the whole token family. Refreshes are serialized in the RTK Query client. Keep refresh tokens out of logs, analytics and URLs. Token links are single use and expire; configure an SMTP service that meets the store's deliverability requirements. Registration and forgotten-password responses avoid explicit account enumeration, but timing resistance requires further review.

## Rate limits and bot checks

Redis limiters fail closed when Redis is unavailable and return `Retry-After` for exhausted limits. Separate global, login, register, refresh, reset, search, checkout, upload and admin budgets exist. Login also counts failures by hashed account identifier. Turnstile runs for registration, resets, checkout and login after five account failures. Production boot requires a Turnstile secret. A honeypot is validated for registration and checkout. Request slowing, advanced behavior detection and IP blocklists are not implemented.

API `trust proxy=1` assumes exactly one trusted proxy hop. Nginx overwrites forwarding headers. Bind the API port to loopback/private networking and prevent direct public access. If Cloudflare adds another hop, use a verified trusted proxy address function; do not blindly increase the hop count.

## Storage and auditing

Uploads are authenticated, permission checked, magic-byte inspected, capped at 8 MB / 25 million decoded pixels, randomly named, EXIF-stripped and WebP re-encoded at 480/960/1600 widths. The application uploads those bytes through short-lived signed PUT URLs; arbitrary customer-provided object keys are never accepted. Uploads are currently processed synchronously, with BullMQ used for emails and rollups. Use a dedicated storage worker before increasing upload traffic.

Application routes cannot edit audit records. A database trigger rejects UPDATE/DELETE. Production should also use a restricted DB role without schema ownership; table owners can disable triggers. Retain logs according to legal requirements and store backups separately.

## Release gate

This repository has not passed an independent security assessment, load test or production deployment. Outstanding features and unverified controls are recorded in `docs/STATUS.md`. Do not treat this document as a claim of OWASP certification. Run the CI security jobs, review advisories and perform the manual permission/IDOR, refresh reuse and concurrency cases before accepting customers.
