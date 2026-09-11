# Proposal: Phase 1 API Session Primitives

## Intent

Deliver the runtime-only primitives for secure, revocable API sessions while preserving caller-owned lifecycle decisions and the archived schema boundary.

## Scope

### In Scope
- Manager-aware repository facades, caller-owned transactions, and real PostgreSQL session locking.
- Ordered retry/reconcile/conflict/current/reuse/invalid classification with conflict-safe operation insert and re-read.
- Idempotent single/user-wide revocation and positive bounded, retention-safe, operation-first CTE purge using `SKIP LOCKED`.
- Independent versioned HMAC/HKDF keyrings, canonical domain-separated inputs, active/retained lookup, validation, and persisted-version readiness.
- Nest module/config wiring, secret prohibition, bearer/role compatibility, and retained strict-TDD/runtime evidence.

### Out of Scope
- Controllers, endpoints, login/refresh/logout orchestration, cookies, CSRF, or Origin handling.
- Password recovery, outbox, SMTP, audit/OpenAPI lifecycle work, or schedulers.
- Web/Mobile work and physical schema, entity metadata, migration, constraint, or index changes.

## Capabilities

### New Capabilities
- `api-session-primitives`: Runtime persistence, classification, revocation, cleanup, cryptography, configuration, and readiness contracts for API sessions.

### Modified Capabilities
None. Canonical `api-session-schema` requirements remain unchanged and are consumed as a prerequisite.

## Approach

Add narrow stateless facades under `src/auth/session-foundation/**`; every database method accepts an `EntityManager`. Lock sessions before classification and return retry, reconciliation, or conflict before mutation. Use `ON CONFLICT DO NOTHING` plus locked re-read, and deterministic operation-first cleanup CTEs. Implement HMAC-SHA256/HKDF-SHA256 with exact parent canonical encodings and a bootstrap provider that resolves all five persisted key-version columns.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/auth/session-foundation/**` | New | Persistence, crypto, readiness, tests |
| `src/auth/auth.module.ts` | Modified | Register/export entities and providers |
| `src/config/env.validation.ts` | Modified | Validate independent keyrings |
| `src/config/env.validation.spec.ts`, `test/app.e2e-spec.ts` | Modified | Configuration and compatibility evidence |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Classifier precedence permits mutation on conflict | Medium | Lock, ordered outcomes, race tests |
| Cleanup destroys retained evidence | Medium | Operation-first predicates, bounds, PostgreSQL concurrency tests |
| Proof-bearing slice exceeds forecast | High | Reforecast before apply; chain/split or obtain a new explicit exception |

## Rollback Plan

Remove module/config registrations and `session-foundation` code, preserving schema rows and every referenced key until expiry. No schema rollback is part of this child.

## Dependencies

- Archived `api-session-schema` production source must exist in the actual child base before apply; its 1500-line exception does not transfer.

## Success Criteria

- [ ] PostgreSQL tests prove locking, rollback atomicity, races, reuse, revocation, and bounded retention-safe purge.
- [ ] Exact crypto vectors, keyring failures, retained-version readiness, and secret separation pass.
- [ ] Unit, E2E bearer/role, build, and lint checks pass with RED-before-GREEN evidence.
- [ ] Apply uses an honest line forecast and an approved delivery decision.
