# ManaTown Digital

**Local Problems. Local Solutions.**  
An English- and Telugu-language community platform for Kadiri, Andhra Pradesh.

This repository is being implemented in verifiable phases. The foundation,
public directories, owner moderation, private issue reporting, and initial
administrator workflows are present as an MVP foundation. Administration
currently includes user-role assignment, bilingual business-category editing,
and ad-campaign scheduling and event counts; ad-banner upload and several
production integrations remain incomplete. Do not treat the project as a
complete or production-deployable product.

## Prerequisites

- Node.js 22 or newer and npm
- Docker Compose (for the local PostgreSQL and MinIO services)
- Expo Go for device previews, or Android Studio for native builds

## Local development

1. Copy `.env.example` to `.env`; keep the provided credentials local only.
   In PowerShell: `Copy-Item .env.example .env`.
2. Start PostgreSQL with `docker compose up -d postgres` and wait for its
   health check. MinIO is optional; image upload is not wired into the API.
3. Install dependencies using `npm ci`.
4. Generate Prisma Client, apply migrations, and load fictional development
   data with `npm run db:setup`.
5. Start the API with `npm run dev:api`. Check API liveness at
   `http://localhost:3000/api/v1/health` and database readiness at
   `http://localhost:3000/api/v1/health/ready`.
6. Start the client with `npm run dev:web`; open `http://localhost:8081`.

The web client uses `EXPO_PUBLIC_API_URL` and mock identity settings from `.env`
at bundle start. Restart Expo after changing those variables. The readiness
route returns HTTP 503 while PostgreSQL is unavailable; liveness alone does not
prove the database is ready.

For Neon, set `DATABASE_URL` to the pooled connection string for API traffic and
`DIRECT_URL` to the unpooled connection string for Prisma migrations. Keep both
URLs in the deployment secret store; never commit credentials.

The development mock authentication switch must be rejected unless
`NODE_ENV=development` or `NODE_ENV=test`. It is not a production identity
provider. Select and configure a production authentication provider before a
public launch; SMS OTP is deliberately out of scope.

## Checks

- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run lint`

Use `npm run db:deploy` to apply committed migrations to a configured target
without generating new migrations. `npm run db:migrate` is for local schema
development and may prompt before resetting a development database.

The project CI workflow runs checks before packaging. Deployments and Expo
publishing still require a hosting target, protected environment secrets, and
release configuration; none are claimed to be configured by this scaffold.

## Release path

JavaScript and asset-only Android changes may use Expo Updates only when the
published update matches the installed native runtime. Native code, permissions,
native dependencies, or incompatible runtime changes require a new Android
binary and its normal distribution/review process. Web releases require a
successful CI run and a configured deployment target. Keep a previous known
good release available for rollback.

See [docs/architecture.md](docs/architecture.md),
[docs/database.md](docs/database.md), [docs/security.md](docs/security.md),
[docs/testing.md](docs/testing.md), [docs/deployment.md](docs/deployment.md),
and [docs/operations.md](docs/operations.md) for current scope and runbooks.
