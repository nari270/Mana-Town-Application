# Operations

## Local services

Use `docker compose up -d` to run local PostgreSQL and MinIO. Do not reuse local
credentials in a hosted environment.

## Production readiness checklist

- Provision managed PostgreSQL with encryption, backups, restore testing, and
  restricted network access.
- Provision private S3-compatible storage with lifecycle and access policies.
- Configure HTTPS, explicit CORS origins, rate limits, and centralized logs.
- Set deployment secrets in protected CI environments.
- Decide the production identity provider and privacy/consent text.
- Exercise health checks, migrations, backup restoration, and rollback.

## Incident/release rollback

Stop promotion when health checks fail. Roll application code back to the last
known-good release. Do not automatically reverse destructive schema changes;
use forward fixes or a tested backup restore plan.
