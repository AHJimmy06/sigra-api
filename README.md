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
createdb sigra
npm run migration:run
npm run start:dev
```

The API is available at `http://localhost:3000/api`. TypeORM `synchronize` is always disabled. Set `DATABASE_RUN_MIGRATIONS=true` only when automatic startup migrations are intentionally desired.

The database role that runs the initial migrations must be allowed to execute
`CREATE EXTENSION` for both `pgcrypto` and `pg_trgm`. Managed PostgreSQL services
may require an administrator to enable these extensions before application
deployment. `pgcrypto` provides `gen_random_uuid()` for primary keys, while
`pg_trgm` provides the trigram operator classes used by Phase 0 search indexes.
After the extensions exist, migrations can run under a less-privileged deployment
role that has the required schema DDL permissions.

## Development accounts

Set `SEED_DEVELOPMENT_ACCOUNTS=true` and provide `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_GUARD_EMAIL`, and `SEED_GUARD_PASSWORD`. Passwords must be at least 12 characters. Seeding is disabled in production, is idempotent by email, and stores bcrypt hashes only. Resident accounts are created through the admin resident endpoint.

## Commands

```bash
npm run migration:run
npm run migration:revert
npm run lint
npm run build
npm test
npm run test:e2e
```

## Access and synchronization boundary

Resident endpoints create, list, revoke, and render current TOTP passes. QR payloads use the versioned JSON contract `{"v":1,"passId":"uuid","token":"123456"}` and identify themselves as `sigra.access.v1`. TOTP secrets are AES-256-GCM encrypted at rest and never sent to guard clients.

Guard validation is intentionally online. There is no unsafe offline verifier cache. Clients may retry access writes with the same `clientEventId`; the API's unique idempotency key prevents duplicates. A future offline client must queue the complete validation request and clearly show that authorization is pending until connectivity returns.

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
```

Errors use the stable `{ code, message, details?, requestId }` contract. Never place real credentials or tokens in checked-in examples.
