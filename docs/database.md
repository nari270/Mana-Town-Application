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

## Connection URLs

For local development, configure `DATABASE_URL` and `DIRECT_URL` with the local
PostgreSQL URLs from `.env.example`. For Supabase, use the session pooler for
`DATABASE_URL` and the direct connection for `DIRECT_URL`; keep both in the
environment secret store. The Prisma datasource maps `url` and `directUrl` to
these variables.

The Supabase migration maps legacy `RESIDENT` and `WOMEN_ENTREPRENEUR` roles to
`CUSTOMER` and `BUSINESS_OWNER`, removes the legacy username/password-hash
fields, and links application users to Supabase Auth IDs. It enables and forces
RLS, grants only the required table operations, and applies per-table policies
for customer-owned reports, business ownership, admin workflows, and the public
advertisement exception. The Nest API wraps each HTTP request in a transaction,
sets the database role to `authenticated`, and sets `request.jwt.claim.sub` only
after Supabase validates the access token. Anonymous API requests have no user
claim and can access only eligible advertisements and their events.

Run `npm run db:verify-rls -w @mana-town/api` against the migrated project after
seeding the demo accounts. It creates two temporary issue rows, verifies
anonymous denial and cross-user read/update isolation, then removes the rows.
The seed and other explicitly privileged maintenance tasks continue using the
server-side database connection outside request context.

## Backup and restore

For managed PostgreSQL, configure provider backups and periodically test a
restore into a separate database. For a self-managed instance, use encrypted,
off-host `pg_dump` backups and verify restoration before relying on them. A
backup is not validated until a restore has been exercised. Production retention,
encryption keys, and recovery objectives must be selected before launch.
