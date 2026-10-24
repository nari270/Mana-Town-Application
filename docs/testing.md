# Testing

CI runs formatting, TypeScript checks, unit tests, database-backed API journeys,
and builds before merge/deploy. The API journey test exercises email sign-in,
owner listing submission and moderation, resident-private reports,
entrepreneur review, admin user/category/campaign management, and ad event
analytics against PostgreSQL.

The database-backed test is opt-in locally and only accepts a database named
`mana_town_test`. Start its isolated Compose service:

```powershell
docker compose up -d postgres-test
$env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/mana_town_test?schema=public'
$env:DIRECT_URL = $env:DATABASE_URL
$env:NODE_ENV = 'test'
$env:SEED_DEMO_DATA = 'true'
npm run db:deploy
npm run db:seed
$env:MANA_TOWN_ALLOW_DB_INTEGRATION = 'true'
npm run test:integration
```

Use a separate, non-production Supabase project in `.env` for this test because
the seed provisions or resets the four `@manatown.test` Auth accounts. The
passwords and Supabase keys must stay in ignored local environment files. The
test writes records to PostgreSQL, so do not point it at a development or
production database. The script compiles first because Nest constructor
injection needs `emitDecoratorMetadata`, which `tsx` does not emit.

After migration and demo seeding, run `npm run db:verify-rls -w @mana-town/api`
with the Supabase project URLs set in `.env`. It verifies anonymous issue
denial, per-user issue visibility, and cross-user update denial, then removes
its temporary records. Do not run it against production data; use a dedicated
staging Supabase project.

Known issue: `npm audit` reports high-severity advisories in `prisma`,
`@nestjs/platform-express`, `expo`, `node-forge`, `postcss` and `zod`. The
automatic fixes are major or breaking upgrades, so they need planned
upgrade work; the CI audit step is advisory until then. Critical authorization
cases include public access to approved businesses only, owner-scoped edits,
admin-only issue queues, and resident access to their own reports only.

Playwright web workflows and React Native Testing Library coverage remain
future work.

Android binary builds require an Android-capable CI environment and are not
validated by a web-only TypeScript check.
