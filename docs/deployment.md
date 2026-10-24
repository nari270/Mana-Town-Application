# Deployment

The CI workflow currently validates changes only. Render configuration is
present, but a production deployment, hosted database cutover, Expo OTA
publishing, Android distribution, and rollback are not verified; protected host
and Supabase credentials are required.

Keep development, staging, and production isolated. Validate additive database
migrations before release; use an expand/migrate/contract approach for breaking
changes. Block release on mandatory tests. Record deployed commit and release
version and retain a known-good rollback target.

The Render API build runs `prisma migrate deploy` against the configured
database. Set `DATABASE_URL` to the Supabase session-pooler URL and `DIRECT_URL`
to that same Supabase project's direct PostgreSQL URL; the Supabase auth
migration depends on its `auth` schema and removes the legacy username/password
columns. Back up the source database before deploying. The one-time
Neon-to-Supabase data copy is separate and is not run by Render.

Both Render services are pinned to the `version1.1` branch in `render.yaml`.
The API's comma-separated `CLIENT_ORIGIN` values must exactly match the
deployed static site's origins, and the static site's `EXPO_PUBLIC_API_URL`
must point to the deployed API. The current deployed services use the
`manatown-api-k8wh` and `manatown-web-k8wh` domains. If Render creates
different suffixed service names, update these values to the generated service
domains before syncing the Blueprint.
When creating a new Blueprint, provide the `sync: false` database and Supabase
values for the newly created API service. When syncing an existing Render
service, Render retains its current secret values instead of prompting again;
update `DATABASE_URL`, `DIRECT_URL`, and the Supabase keys in that service's
Environment settings if the target database or project has changed. Render
does not create or rotate Supabase database credentials.

Business photos are stored in a private S3-compatible bucket. Configure
`S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` on the
Render API service before enabling owner uploads. Set `S3_ENDPOINT` for
non-AWS providers and `S3_FORCE_PATH_STYLE=true` when required by that provider.
The API returns short-lived signed photo URLs; never expose storage credentials
in the client or make the bucket public.

The home page and business directory can reverse-geocode a user's location
through the API. The default provider is OpenStreetMap Nominatim; it receives
coordinates only after the user grants location access. Display the returned
attribution, keep requests user-triggered, and do not exceed Nominatim's
one-request-per-second application limit. The API caches lookups in memory and
identifies itself with `GEOCODING_USER_AGENT`. Change `GEOCODING_BASE_URL` and
`GEOCODING_ATTRIBUTION` in the API service settings to switch providers. This
in-memory throttle is for a single API instance; use a shared cache and
application-wide rate limiter before scaling to multiple instances.

Expo Updates is only for JavaScript/assets compatible with the installed native
runtime. Native changes require a new Android binary and may require store
review. Before public launch, configure and verify the Supabase Auth email
confirmation and delivery settings for the production project.
Signup confirmation links redirect to the first origin in `CLIENT_ORIGIN` at
`/login`. Add a matching URL (for local development, for example
`http://localhost:8081/**`) to Supabase Authentication > URL Configuration >
Redirect URLs. If a custom confirmation email template is used, ensure its link
uses `{{ .ConfirmationURL }}` so Supabase applies the requested redirect.

Hosting, domain, managed database, object storage, bandwidth, CI minutes, and
Expo build/update services may incur charges; compare current provider pricing
before choosing a production plan. Docker Compose is for local development,
not production.
