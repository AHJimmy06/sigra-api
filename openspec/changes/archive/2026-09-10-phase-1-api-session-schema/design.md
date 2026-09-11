# Design: Phase 1 API Session Schema

## Boundary

This child owns only physical persistence for R1/Persist reconciliation facts and R6/Forward and reverse parity. It does not expose runtime behavior or implement the parent change.

## Physical Model

`auth_sessions` contains a UUID primary key, cascading user reference, `current_refresh_digest bytea NOT NULL UNIQUE` with a 32-byte check, non-negative generation, current digest and derivation versions constrained to canonical ASCII values, absolute expiry, optional revocation timestamp, and database-created timestamps with `now()` defaults.

`refresh_operations` contains a UUID primary key, cascading session reference, operation UUID, `presented_digest bytea NOT NULL` with a 32-byte check, presented/result digest and result derivation versions constrained to canonical ASCII values, non-negative result generation, expiry, and creation timestamp. `(session_id, operation_id)` is unique.

The migration and entities preserve indexes for current-digest uniqueness, user revocation, `(absolute_expires_at, id)`, operation uniqueness, presented-digest lookup, and `(expires_at, id)`. No raw refresh, CSRF, access-token, or password value has a column in either table.

## Parity and Rollback

Metadata parity tests compare every declared type, nullability, default, check, foreign key, uniqueness rule, and index with the handwritten migration. A forward migration applies both tables and required indexes. Its reverse path drops `refresh_operations` before `auth_sessions`, leaving no schema objects introduced by this child.

## TDD Plan

The later schema apply path MUST use the following sequence; this planning child does not add tests, migrations, entities, or datasource registrations.

1. **RED — metadata and DDL parity:** extend `src/config/typeorm-metadata.spec.ts` first with failing assertions for both absent session entities and their required table names, column types, nullability, defaults, checks, foreign keys, uniqueness rules, and indexes. The assertions MUST explicitly cover the UUID primary keys; cascading `user_id` and `session_id` foreign keys; 32-byte `bytea` digest checks; non-negative generations; canonical ASCII `varchar(32)` version checks; `now()` timestamp defaults; optional `revoked_at`; `current_refresh_digest` uniqueness; `(session_id, operation_id)` uniqueness; and indexes for user revocation, `(absolute_expires_at, id)`, presented-digest lookup, and `(expires_at, id)`.
2. **RED — migration lifecycle:** before creating a handwritten migration, add failing integration coverage that applies the API-session migration to a clean supported database, inspects the resulting table/index/constraint metadata, reverses the migration, and proves no API-session schema objects remain. The test MUST assert that reversal drops `refresh_operations` before `auth_sessions` and preserves pre-existing schema.
3. **GREEN:** only after each RED failure is observed, add the smallest matching changes in `src/auth/**/*.entity.ts`, `src/migrations/*session*`, `src/config/typeorm.datasource.ts`, and `src/config/typeorm-metadata.spec.ts`. Keep entity metadata and the handwritten up/down migration equivalent; do not add repository or runtime behavior.
4. **REFACTOR:** remove duplication in test fixtures or metadata expectations without weakening assertions, then rerun the focused parity suite and the clean-database forward/reverse migration path. Preserve every physical DDL constraint and index listed in this design.

The planned evidence commands are `npm test -- --runInBand config/typeorm-metadata.spec.ts` for focused parity and `npm run db:dev:up && npm run migration:run && npm run migration:revert && npm run db:dev:down` for end-to-end migration lifecycle. Runtime evidence applies only to the later schema-production task; it is N/A for this planning-only task because no runtime boundary is created.

## Threat Matrix

N/A — this child creates physical schema and planning artifacts only; it has no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.
