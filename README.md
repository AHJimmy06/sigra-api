# SIGRA API

NestJS, TypeORM, and PostgreSQL API for SIGRA administration, resident services, maintenance, and guard access validation.

## Requirements

- Node.js 22 or newer
- PostgreSQL 15 or newer with `pgcrypto` and `pg_trgm` available

## Local setup

```bash
npm install
cp .env.example .env
openssl rand -base64 32 # use the output for PASS_SECRET_ENCRYPTION_KEY
# Set a random JWT_SECRET of at least 32 characters and PostgreSQL values in .env.
npm run db:dev:up
npm run migration:run
npm run start:dev
```

The development Compose stack binds PostgreSQL only to `127.0.0.1` on `SIGRA_POSTGRES_PORT` (default `55439`) and stores data in a project-specific Docker volume. `DATABASE_PASSWORD` and `SIGRA_POSTGRES_PASSWORD` must contain the same local-only development value.

The API is available at `http://localhost:3000/api`. TypeORM `synchronize` is always disabled. Set `DATABASE_RUN_MIGRATIONS=true` only when automatic startup migrations are intentionally desired.

The database role that runs the initial migrations must be allowed to execute
`CREATE EXTENSION` for both `pgcrypto` and `pg_trgm`. Managed PostgreSQL services
may require an administrator to enable these extensions before application
deployment. `pgcrypto` provides `gen_random_uuid()` for primary keys, while
`pg_trgm` provides the trigram operator classes used by Phase 0 search indexes.
After the extensions exist, migrations can run under a less-privileged deployment
role that has the required schema DDL permissions.

## Development accounts

Set `SEED_DEVELOPMENT_ACCOUNTS=true` and provide the account variables below. Passwords must be at least 12 characters. Seeding is disabled in production, is idempotent by email, and stores bcrypt hashes only.

| Role     | Required variables                              | Optional resident data                                                        |
| -------- | ----------------------------------------------- | ----------------------------------------------------------------------------- |
| ADMIN    | `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`       | —                                                                             |
| GUARD    | `SEED_GUARD_EMAIL`, `SEED_GUARD_PASSWORD`       | —                                                                             |
| RESIDENT | `SEED_RESIDENT_EMAIL`, `SEED_RESIDENT_PASSWORD` | `SEED_RESIDENT_NAME`, `SEED_RESIDENT_UNIT_CODE`, `SEED_RESIDENT_UNIT_ADDRESS` |

The resident seed creates its active unit, resident record, and linked user atomically. Its default development unit is `DEMO-101` with one parking space.

## Time and validation rules

- `RESIDENTIAL_TIME_ZONE` is an IANA time zone and defaults to `America/Guayaquil`.
- Date-only access-history filters represent complete calendar days in that zone and are converted to UTC for storage queries.
- Dashboard “today” and its seven-day flow use the same residential time zone and include allowed and denied events.
- Resident phone numbers are optional. When provided, they must be 7–40 characters, contain at least seven digits, and may use an international prefix, spaces, parentheses, periods, hyphens, or a numeric `ext.`/`x` suffix.
- `parkingSpaces` is an integer from 0 through 1000; both DTO validation and PostgreSQL enforce the maximum.

## Commands

```bash
npm run migration:run
npm run migration:revert
npm run db:dev:up
npm run db:dev:down
npm run lint
npm run build
npm test
npm run test:e2e
```

## Access and synchronization boundary

Resident endpoints create, list, revoke, and render current TOTP passes. QR payloads use the versioned JSON contract `{"v":1,"passId":"uuid","token":"123456"}` and identify themselves as `sigra.access.v1`. TOTP secrets are AES-256-GCM encrypted at rest and never sent to guard clients.

Guard validation is intentionally online. There is no unsafe offline verifier cache. Clients may retry the exact access request with the same `clientEventId`; the API returns the original event. Reusing that ID with another QR payload, direction, or guard fails with `409 CONFLICT`. Only a SHA-256 request fingerprint is stored—never the QR payload. A future offline client must queue the complete validation request and clearly show that authorization is pending until connectivity returns.

Residents can render the current short-lived QR through `GET /api/access/passes/:id/qr`. The API never returns the encrypted or decrypted TOTP seed. Offline resident generation remains deferred until a device-bound provisioning design with encryption, rotation, and revocation is approved. Guard validation remains authoritative and online.

Maintenance creation accepts multipart fields `clientRequestId`, `description`, and one `image`. JPEG, PNG, and WebP files are limited to 5 MiB and stored under generated names. The client request ID is idempotent for deferred synchronization.

## API contract and examples

Swagger UI is served at `http://localhost:3000/api/docs`. Generate the versioned OpenAPI artifact with `npm run openapi:generate`, and verify that the checked-in artifact is current with `npm run openapi:check`.

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"replace-with-development-password"}'

curl 'http://localhost:3000/api/residents?page=1&pageSize=10' \
  -H 'Authorization: Bearer replace-with-access-token'

curl 'http://localhost:3000/api/access/events?search=ana&from=2026-09-01&to=2026-09-07&page=1&pageSize=10' \
  -H 'Authorization: Bearer replace-with-admin-access-token'
```

Errors use the stable `{ code, message, details, requestId }` contract. `details` is always an object, including when it is empty. Never place real credentials or tokens in checked-in examples.
