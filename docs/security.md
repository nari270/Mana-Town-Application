# Security

- Enforce authentication, role checks, and record ownership in the API.
- Public routes return approved listing data only.
- Do not allow user-controlled role assignment.
- Authentication is username/password. Passwords are stored as salted scrypt
  hashes and sessions are 8-hour HMAC-signed tokens (`AUTH_JWT_SECRET`, 32+
  characters, required at startup). Login is limited to 5 failed attempts per
  client and username per 15 minutes. Demo accounts only exist when
  `SEED_DEMO_DATA=true`, which is refused in production.
- Validate input, rate-limit sensitive operations, and use secure headers and
  an explicit production CORS allowlist.
- Validate image content/size and keep issue evidence private.
- Audit sensitive administrator decisions without storing unnecessary personal
  data in logs.
- Keep secrets in environment/hosting secret stores, never frontend bundles.
- Production HTTPS, dependency scanning, backups, a privacy notice, and a
  production identity provider remain launch requirements.

Never seed production administrator credentials or real personal information.
