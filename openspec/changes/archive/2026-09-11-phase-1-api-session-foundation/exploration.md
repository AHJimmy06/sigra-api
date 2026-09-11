# Exploration: Phase 1 API Session Foundation

## Current State

`sigra-api` is a NestJS 11 application using TypeORM with PostgreSQL. Runtime entity discovery relies on `autoLoadEntities: true` plus feature-module `TypeOrmModule.forFeature(...)` registration, while the migration CLI uses the `*.entity` glob and an explicit migration list in `src/config/typeorm.datasource.ts`. Migrations are handwritten, reversible SQL and existing tests compare migration SQL with TypeORM metadata without connecting to PostgreSQL.

Authentication currently has no session persistence. `AuthService.login` loads an active `User` and writes the login audit inside a `DataSource.transaction`, then signs an eight-hour JWT outside that transaction. `JwtAuthGuard` validates the bearer token and reloads the active user. There are no refresh credentials, refresh-operation records, retention jobs, or cleanup repository APIs.

Persistence is normally injected directly as TypeORM `Repository<T>` instances. Multi-write operations open a `DataSource.transaction` and obtain repositories from its `EntityManager`; `AuditService.record` follows this manager-aware boundary. The access-event flow already demonstrates a useful idempotency pattern: a unique client operation identifier plus a request fingerprint, transactionally inserted, followed by duplicate recovery. It is not sufficient for session rotation because session reuse requires row locking, durable superseded-digest lookup, and deterministic result reconciliation.

Current crypto/config primitives are intentionally separate from the required session design. Passwords use bcrypt; access validation fingerprints use plain SHA-256; access-pass secrets use reversible AES-256-GCM under one environment key. None should be reused for refresh digests. Environment validation is centralized in `validateEnvironment`, currently validates JWT and access-pass keys outside tests, and has no versioned keyring support.

The umbrella assigns this child only the shared session and refresh-operation persistence, repository contracts, HMAC/HKDF and versioned-key primitives, indexes, cleanup APIs, and migration. Endpoint behavior, login/refresh/logout orchestration, cookies, CSRF/Origin enforcement, audits/OpenAPI, password-reset/outbox persistence, SMTP, Web, and Mobile remain downstream or excluded.

## Affected Areas

- `src/auth/` — add a foundation module, session and refresh-operation entities, manager-aware repository facades, and domain-separated digest/derivation primitives; do not add controllers or lifecycle orchestration.
- `src/auth/auth.module.ts` — later registration/export point for the foundation module; the existing eight-hour JWT setting is a lifecycle handoff, not foundation scope.
- `src/config/env.validation.ts` — extend fail-fast validation only for versioned digest/derivation keyrings and active key versions.
- `src/config/typeorm.datasource.ts` — explicitly register the new migration; entity discovery already uses a glob.
- `src/migrations/` — add one reversible migration for both tables, foreign keys, constraints, and indexes.
- `src/config/typeorm-metadata.spec.ts` and focused new `src/auth/**/*.spec.ts` tests — RED coverage for entity/migration parity, keyring validation, deterministic derivation, digest separation, repository locking, and cleanup boundaries.
- `openspec/changes/phase-1-api-session-foundation/` — proposal/spec/design/tasks must preserve the umbrella ownership boundary and feature-branch chain targeting `develop`.

## Approaches

1. **Manager-aware repository facades with normalized persistence** — Create `auth_sessions` and `refresh_operations`, expose narrow repository methods that accept an `EntityManager` for lifecycle-owned transactions, and derive replayable outputs through versioned, domain-separated HKDF while storing only HMAC-SHA256 digests.
   - Pros: Preserves atomic rotation/revocation, supports pessimistic locking and same-operation reconciliation, prevents raw-secret persistence, gives recovery a narrow revoke-all contract, and matches existing transaction patterns.
   - Cons: Introduces the first explicit repository-facade layer and requires careful key-retention and operation-retention rules.
   - Effort: Medium

2. **Direct TypeORM repositories with random refresh secrets** — Export entities and let lifecycle services inject repositories directly, storing current/superseded digests and handling retries ad hoc.
   - Pros: Closest to current modules and initially smaller.
   - Cons: Leaks persistence details into lifecycle, makes transaction ownership and locking inconsistent, and cannot safely reproduce a lost rotation response without storing reversible/raw result material or adding grace behavior forbidden by the contract.
   - Effort: Low initially, High once lifecycle concurrency is implemented

## Recommendation

Use manager-aware repository facades and two normalized tables.

`auth_sessions` should contain a UUID session identifier, `user_id` with cascading deletion, current refresh digest, credential generation, digest-key version, derivation-key version, absolute expiry, nullable revocation timestamp, and timestamps. It should never contain a raw refresh or CSRF secret. `refresh_operations` should contain a UUID operation identifier, session foreign key with cascading deletion, presented credential digest, resulting generation/key-version facts needed for deterministic reconciliation, operation expiry, and creation timestamp. A uniqueness constraint must reject operation-ID reuse within a session, and retained presented digests must distinguish a compatible retry from reuse under a distinct operation.

Use independent versioned keyrings for digesting and derivation. HMAC-SHA256 should produce fixed-length lookup digests; HKDF-SHA256 should derive refresh and CSRF material with explicit, different context labels containing session ID and credential generation. Store key versions beside persisted facts, expose only active-version selection and version lookup, and fail startup on malformed, duplicate, missing-active, undersized, or production-default key material. Existing JWT, bcrypt, SHA-256 fingerprint, and AES keys must remain separate.

Repository contracts should provide: create/find session; lock a session for mutation through a caller-provided `EntityManager`; find current or superseded digest facts; record/find an operation; revoke one session; revoke all sessions for a user; and bounded purge methods. Lifecycle must own the enclosing transaction and security decisions. Recovery may consume only `revokeAllForUser(...)`, without importing entities or redefining persistence.

Indexes should directly support `(current_refresh_digest)` uniqueness/lookup, `(user_id, revoked_at, absolute_expires_at)` revocation scans, `(absolute_expires_at, id)` session cleanup, `(session_id, operation_id)` uniqueness/reconciliation, presented-digest reuse lookup, and `(expires_at, id)` operation cleanup. Refresh-operation retention must last at least through the parent session's absolute lifetime so an older superseded credential remains detectable. Cleanup belongs here only as bounded repository APIs (cutoff plus batch size); scheduling/operations wiring is not part of this child. Key versions must remain configured for every live session and retained operation that references them.

Strict TDD should later start with crypto/config and migration/entity metadata tests, then repository contract tests exercising row locks, uniqueness conflicts, atomic manager use, revocation, and bounded cleanup. The current Jest unit harness can cover most of this; migration execution against PostgreSQL remains a verification harness. Forecast remains the umbrella's 280–380 lines, but the change must split before apply if the child task forecast reaches 400 lines.

## Risks

- Insufficient operation retention would convert confirmed reuse into an indistinguishable invalid credential and weaken mandatory session revocation.
- Premature key removal would make reconciliation impossible for still-live sessions; deployment guidance must tie key retirement to maximum session and operation retention.
- Entity decorators and migration SQL can drift because schema generation is disabled; metadata and reversible-SQL tests are required.
- Repository methods that open their own transactions would break lifecycle atomicity; transaction ownership must remain with the caller through `EntityManager`.
- The CodeGraph index returned only root application symbols for relevant auth queries, so source mapping required the permitted filesystem fallback and should be rechecked after the index is refreshed by its normal watcher.
- The umbrella design also mentions validated lifetime, cookie, and origin configuration, while this child launch narrows ownership to digest/derivation key-version primitives; the child proposal must state that endpoint-facing configuration belongs to lifecycle or explicitly reconcile that handoff before apply.

## Ready for Proposal

Yes. The proposal should freeze the two-table model, manager-aware repository contracts, HMAC/HKDF keyring format and retention guarantees, exact cleanup semantics, lifecycle/recovery handoffs, and the narrowed configuration ownership. It must keep all endpoint, cookie/CSRF/Origin enforcement, audit/OpenAPI, reset/outbox, SMTP, Web, and Mobile work out of this child.
