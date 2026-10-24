# Deployment

The CI workflow currently validates changes only. Production web deployment,
database provisioning, Expo OTA publishing, Android distribution, and rollback
are not yet configured; protected host and Expo credentials are required.

Keep development, staging, and production isolated. Validate additive database
migrations before release; use an expand/migrate/contract approach for breaking
changes. Block release on mandatory tests. Record deployed commit and release
version and retain a known-good rollback target.

Expo Updates is only for JavaScript/assets compatible with the installed native
runtime. Native changes require a new Android binary and may require store
review. A production authentication provider must be selected before public
launch.

Hosting, domain, managed database, object storage, bandwidth, CI minutes, and
Expo build/update services may incur charges; compare current provider pricing
before choosing a production plan. Docker Compose is for local development,
not production.
