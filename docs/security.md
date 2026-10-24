# Security

- Enforce authentication, role checks, and record ownership in the API.
- Public routes return approved listing data only.
- Do not allow user-controlled role assignment.
- Development mock authentication must fail closed outside development/test.
- Validate input, rate-limit sensitive operations, and use secure headers and
  an explicit production CORS allowlist.
- Validate image content/size and keep issue evidence private.
- Audit sensitive administrator decisions without storing unnecessary personal
  data in logs.
- Keep secrets in environment/hosting secret stores, never frontend bundles.
- Production HTTPS, dependency scanning, backups, a privacy notice, and a
  production identity provider remain launch requirements.

Never seed production administrator credentials or real personal information.
