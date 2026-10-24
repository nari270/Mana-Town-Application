# Testing

CI runs formatting, TypeScript checks, unit tests, database-backed API journeys,
and builds before merge/deploy. The API journey test exercises registration
seed identities, owner listing submission and moderation, resident-private
reports, entrepreneur review, admin user/category/campaign management, and ad
event analytics against PostgreSQL.

The database-backed test is opt-in locally and only accepts a database named
`mana_town_test`. Start its isolated Compose service:

```powershell
docker compose up -d postgres-test
$env:DATABASE_URL = 'postgresql://mana:mana_local_only@localhost:5433/mana_town_test?schema=public'
$env:NODE_ENV = 'test'
$env:MOCK_AUTH_ENABLED = 'true'
npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
npx tsx apps/api/prisma/seed.ts
$env:MANA_TOWN_ALLOW_DB_INTEGRATION = 'true'
npm run test:integration
```

It writes test records, so do not point it at a development or production
database. On Neon, create a separate `mana_town_test` database
(`neon databases create --name mana_town_test`) and swap only the database name
in `DATABASE_URL`/`DIRECT_URL`. The script compiles first because Nest
constructor injection needs `emitDecoratorMetadata`, which `tsx` does not emit.

Known issue: `npm audit` reports high-severity advisories in `prisma`,
`@nestjs/platform-express`, `expo`, `node-forge`, `postcss` and `zod`. The
automatic fixes are major or breaking upgrades, so they need planned
upgrade work; the CI audit step is advisory until then. Critical authorization cases include
public access to approved businesses only, owner-scoped edits, admin-only issue
queues, and resident access to their own reports only.

Playwright web workflows and React Native Testing Library coverage remain
future work.

Android binary builds require an Android-capable CI environment and are not
validated by a web-only TypeScript check.
