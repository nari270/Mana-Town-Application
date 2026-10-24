# Database

PostgreSQL is the shared data store. Prisma schema and migration history live in
`apps/api/prisma`. Use UUIDs, foreign keys, indexes, constrained status values,
and timestamps. Store status codes independently of display language.

The normalized target includes users/profiles/roles/audit logs; businesses,
categories, category assignments, ownership, hours, images and moderation
history; entrepreneur-classification requests linked to existing owners and
businesses; issue reports, private attachments, status history and internal
notes; advertisement campaigns, assets and events; and application
configuration/feature flags.

Issue evidence must use private object storage. Do not expose object keys or
unscoped attachment URLs publicly. Development seed records must be fictional.

## Local setup

Copy `.env.example` to `.env`, start PostgreSQL with
`docker compose up -d postgres`, then run `npm run db:setup` to generate the
Prisma client, apply the development migration, and load fictional demo data.
`npm run db:deploy` applies only committed migrations to an existing database.
The API readiness endpoint at `/api/v1/health/ready` checks the database
connection; `/api/v1/health` checks only that the API process is alive.

## Neon connection URLs

For Neon, configure `DATABASE_URL` with the pooled endpoint shown by Neon for
long-lived API runtime use. Configure `DIRECT_URL` with the unpooled endpoint
for Prisma migrations. The Prisma datasource maps `url` and `directUrl` to these
variables. Keep the credentials in each environment's secret store.

## Backup and restore

For managed PostgreSQL, configure provider backups and periodically test a
restore into a separate database. For a self-managed instance, use encrypted,
off-host `pg_dump` backups and verify restoration before relying on them. A
backup is not validated until a restore has been exercised. Production retention,
encryption keys, and recovery objectives must be selected before launch.
