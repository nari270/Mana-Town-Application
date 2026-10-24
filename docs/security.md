# Security

- Enforce authentication, role checks, and record ownership in the API.
- Public routes return approved listing data only.
- Do not allow user-controlled role assignment.
- Authentication uses Supabase email/password Auth. The Supabase secret key is
  server-only; only the publishable key may be used by public clients. Demo
  accounts only exist when `SEED_DEMO_DATA=true`, which is refused in
  production.
- RLS is enabled and forced on public tables. The API uses a request-scoped
  transaction with the `authenticated` role and a claim derived only from a
  Supabase-verified access token; requests without a token have no user claim.
  Table policies scope reports to their reporter, business data to owners or
  admins, and admin-only records to the admin role. The only anonymous Data API
  grants are for eligible advertisements and event insertion.
- The API's database owner connection can bypass RLS. HTTP handlers run through
  the request-scoped transaction; only the seed/maintenance path and the
  isolated access-log writer use that privileged connection. Keep those paths
  server-only and do not expose the Supabase secret key or database URL.
- Validate input, rate-limit sensitive operations, and use secure headers and
  an explicit production CORS allowlist.
- Validate image content/size and keep issue evidence private.
- Audit sensitive administrator decisions without storing unnecessary personal
  data in logs.
- Keep secrets in environment/hosting secret stores, never frontend bundles.
- Production HTTPS, dependency scanning, backups, a privacy notice, and a
  production identity provider remain launch requirements.

Never seed production administrator credentials or real personal information.
