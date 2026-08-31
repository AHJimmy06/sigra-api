# SIGRA API

NestJS, TypeORM, and PostgreSQL API for SIGRA administration, resident services, maintenance, and guard access validation.

## Requirements

- Node.js 22 or newer
- PostgreSQL 15 or newer with permission to enable `pgcrypto`

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

The resident-only `GET /api/access/passes/:id/provision` endpoint returns the authenticated resident's own active pass secret with the deterministic contract `{ contract, passId, secret, algorithm: "SHA1", digits: 6, period: 30, validUntil }`. Ownership is part of the database lookup; ADMIN and GUARD are rejected by the role guard. Responses are marked `no-store`, and application code must never log response bodies. The mobile client stores the seed only in SecureStore. Guard clients never receive verifier secrets.

Guard validation is intentionally online. There is no unsafe offline verifier cache. Clients may retry access writes with the same `clientEventId`; the API's unique idempotency key prevents duplicates. A future offline client must queue the complete validation request and clearly show that authorization is pending until connectivity returns.

Resident mobile generation may happen offline after provisioning, but guard validation remains authoritative and online. A copied or compromised provisioned seed can generate codes until pass expiry. Revocation is enforced immediately by online guard validation, while an offline resident device cannot know that revocation occurred until its next successful sync. Production mobile deployments must use HTTPS; plain HTTP is for isolated local development only.

Maintenance creation accepts multipart fields `clientRequestId`, `description`, and one `image`. JPEG, PNG, and WebP files are limited to 5 MiB and stored under generated names. The client request ID is idempotent for deferred synchronization.
