# Deployment runbook

The repository includes local infrastructure, two Dockerfiles, production service composition, Nginx, and CI image publication. No external host has been deployed. Host credentials, DNS, legal identity and service accounts were not supplied.

## Environments

Use separate databases, Redis instances, S3 buckets, JWT secrets, Turnstile sites, SMTP senders and domains for development, staging and production. Never seed demonstration accounts in production.

| Variable                                      | API / web         | Meaning                                                                 |
| --------------------------------------------- | ----------------- | ----------------------------------------------------------------------- |
| `NODE_ENV`                                    | API               | `production` in hosted services                                         |
| `PORT`                                        | API               | Default 4000                                                            |
| `DATABASE_URL`                                | API               | PostgreSQL connection; TLS in production, pool limits sized per replica |
| `REDIS_URL`                                   | API               | Private Redis; authenticated TLS for managed services                   |
| `JWT_SECRET`                                  | API               | At least 48 random characters; rotate with a planned session reset      |
| `WEB_URL`                                     | API               | Exact HTTPS origin, including scheme, without a trailing slash          |
| `SMTP_URL`, `MAIL_FROM`                       | API worker        | Authenticated SMTP transport and verified sender                        |
| `S3_ENDPOINT`, `S3_REGION`                    | API               | S3/R2 service location                                                  |
| `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` | API               | Least-privilege object write access                                     |
| `S3_PUBLIC_URL`                               | API               | CDN-backed public product image prefix                                  |
| `TURNSTILE_SECRET`                            | API               | Required in production                                                  |
| `WHATSAPP_NUMBER`                             | Seed              | Initial digits-only country-code number; subsequently set via admin     |
| `SEED_PASSWORD`                               | Seed only         | Local/demo bootstrap password; do not retain in production              |
| `API_URL`                                     | Web build/runtime | Private API URL for server fetches and rewrite destination              |
| `NEXT_PUBLIC_SITE_URL`                        | Web build         | Canonical HTTPS website URL                                             |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`              | Web build         | Public site key paired with API secret                                  |
| `STORAGE_HOST`                                | Web build/runtime | Approved production image/CDN hostname                                  |
| `API_IMAGE`, `WEB_IMAGE`                      | Compose host      | Immutable registry image references                                     |

For PostgreSQL behind PgBouncer, use transaction pooling and an appropriate Prisma `pgbouncer=true` URL when required by your provider. Migrations require a direct database endpoint; use a separate migration secret/job. A `directUrl` environment configuration should be added to the Prisma datasource for providers requiring separate pooled and direct endpoints.

## Container deployment

1. Create private PostgreSQL, Redis and object storage services; verify backups and restore.
2. Configure GitHub `staging` and `production` environments. Require manual reviewers for production. Set the web build variables listed above. Protect `main` and require successful CI.
3. Build/publish immutable images through the deployment workflow. Pin deployed images by SHA/digest, never a mutable `latest` tag.
4. On the host, create `.env.production` outside the repository and restrict it to the deployment user. Set `API_IMAGE` and `WEB_IMAGE` in the shell. Copy `compose.production.yaml` to the release directory.
5. Run `docker compose -f compose.production.yaml up migrate`. The migration service must complete successfully before rolling API and workers.
6. Run `docker compose -f compose.production.yaml up -d api worker web`. Verify `/health` and `/ready` on the private API, then catalog, authentication and a staging COD order through the web.
7. Install `infra/nginx.conf` with the real hostname. Configure Let's Encrypt using Certbot and force HTTP → HTTPS. Configure Cloudflare to use Full (strict) TLS, WAF managed rules and reasonable bot limits. Protect the origin and administrative routes.
8. Check cookies, CSP, SMTP, image upload, admin permission changes and the WhatsApp number from the public HTTPS domain.

Production compose expects managed/private infrastructure. The development `compose.yaml` credentials and public-read local MinIO setup are not a production infrastructure recipe. The API image currently retains development build tooling for migrations; split a dedicated migration image and prune runtime dependencies before a hardened deployment.

## Vercel alternative

Import the pnpm workspace, select `apps/web` as the root, set all web build variables and allow access to the private API through a supported protected ingress. API, worker, database, Redis and storage run separately (VPS, AWS, Render, Railway or equivalent). Web rewrites and Origin validation must share the same public site origin. Test refresh cookies through the web origin, not directly across arbitrary domains.

## Migration and rollback strategy

Use expand/migrate/contract schema changes. First add nullable columns or new tables, deploy code that handles both schemas, backfill in bounded batches, and only remove old fields after all old replicas are drained. Run migrations as a single release job, not on every API replica. Prisma migrations are tracked and applied once by `migrate deploy`; migration application against a real database is unverified locally.

Before a release record both image digests and take a verified backup. Roll back application images first if the previous code supports the expanded schema. Do not automatically reverse destructive migrations. Restore data only under a deliberate recovery procedure after assessing new writes.

## Backups and recovery

Use daily encrypted `pg_dump -Fc` backups plus provider point-in-time recovery for production. Copy backups to a separate account/bucket with retention controls. A restore rehearsal should create a disposable database, run `pg_restore --no-owner --dbname <restore-url> <backup>`, verify schema/migration history, count orders/items/users and place an isolated test order. Measure actual RPO/RTO; no restore has been performed here. Back up S3 objects and versioning policies separately. Redis persistence is useful but database records remain the commerce source of truth.

## Monitoring and performance

Monitor API readiness, 5xx/429 rates, queue failures/age, DB pool utilization, slow queries, email delivery and inventory discrepancies. Forward Pino JSON to a restricted log service and configure Sentry with PII scrubbing before enabling it. Sentry integration and alert provisioning are outstanding.

Run `k6 run scripts/load-test.js` against staging. Targets: catalog p95 <500ms and error rate <1%. No target report exists until measured. Run Lighthouse on a production mobile deployment and review LCP <2.5s, INP <200ms, CLS <0.1 and score ≥90 as goals, not achieved measurements. Capture EXPLAIN ANALYZE on catalog name/attribute filters and analytics under representative data volume. Add a bundle-budget gate before production; lazy loading alone is not proof of a budget.
