# Architecture

## Target shape

- `apps/client`: Expo Router app shared by Android and React Native Web.
- `apps/api`: NestJS REST API under `/api/v1`.
- `packages/shared-types`: framework-neutral shared contracts.
- `packages/validation`: shared Zod validation schemas.
- `packages/localization`: organized English and Telugu resources.
- PostgreSQL/Prisma as the shared system of record; S3-compatible storage is
  behind an API-owned abstraction.

Start as a modular monolith. Public directory queries are separate from owner
and administrator workflows. Authorization belongs in the API, not just in
navigation or client-side visibility.

## Data flow

Both clients call the same versioned API. TanStack Query caches public results
with finite freshness and invalidates affected records after mutations.
Public business queries include approved records only. Issue reports and
attachments require scoped authorization; private report fields never belong in
public DTOs.

Administrator routes enforce API-side role checks. User-role changes are
audited, prevent self-modification and removal of the last administrator, and
category/campaign writes commit with their audit records. Campaign eligibility
is bounded by schedule and approved advertiser state. Banner asset upload and
production identity integration are not implemented yet.

## Release phases

1. Foundation and schema.
2. Shared bilingual public directory.
3. Owner workflow and moderation.
4. Entrepreneur classification and private issue reporting.
5. Administration and advertising.
6. CI deployment, Expo update channels, and operations.

The supplied prompt included design direction but no reference image attachment;
the initial interface must therefore follow its written palette and accessibility
requirements until a visual reference is provided.
