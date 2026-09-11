# Proposal: Phase 1 API Session Foundation

## Intent

Establish persistence and cryptography for revocable API sessions without lifecycle or transport behavior.

## Scope

### In Scope
- Persist sessions and refresh operations with indexes for reconciliation, reuse detection, revocation, and bounded cleanup.
- Provide manager-aware repositories so lifecycle owns transactions; expose session-wide and user-wide revocation.
- Provide versioned, dedicated HMAC-SHA256 digest and domain-separated HKDF-SHA256 derivation primitives, key retention rules, and fail-fast keyring configuration validation.
- Add one reversible migration and strict RED-GREEN-REFACTOR coverage.

### Out of Scope
- Endpoints/controllers; lifecycle orchestration; cookies, CSRF, or Origin enforcement.
- Audit and OpenAPI lifecycle behavior; password reset, outbox, SMTP, Web, and Mobile.
- Cleanup scheduling or operational job wiring.

## Capabilities

### New Capabilities
- `api-session-foundation`: Session/refresh-operation persistence, manager-aware repositories, versioned cryptography, migration/indexes, revocation, and cleanup APIs.

### Modified Capabilities
None; `sigra-api` has no existing specifications.

## Approach

Add `auth_sessions` and `refresh_operations` behind manager-aware repositories. Store only versioned digests and reconciliation facts, never raw refresh or CSRF material. Lifecycle receives locking, current/superseded lookup, operation reconciliation, revocation, and cleanup contracts while retaining transaction and security-decision ownership. Recovery may consume only user-wide revocation. Retain operations through the parent session’s absolute lifetime and referenced key versions while data remains live.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `src/auth/` | New/Modified | Entities, repositories, cryptography, tests |
| `src/config/env.validation.ts` | Modified | Versioned keyring validation |
| `src/config/typeorm.datasource.ts`, `src/migrations/` | Modified/New | Reversible migration registration, tables, constraints, indexes |
| `src/config/typeorm-metadata.spec.ts` | Modified | Entity/migration parity |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Retention gaps weaken reuse detection | High | Tie operation and key retention to live sessions |
| Repository-owned transactions break atomic lifecycle work | Medium | Require caller-provided `EntityManager` |
| Entity/migration drift | Medium | Metadata parity and reversible migration tests |

## Rollback and Compatibility

Preserve current bearer authentication until coordinated retirement. Roll back lifecycle/recovery consumers first, revoke affected sessions, retain referenced keys and data, then reverse the migration. Do not expose partial session behavior.

## Dependencies

- Umbrella contracts: 15-minute access context, 30-day absolute session lifetime, no-grace reuse, and same-operation reconciliation.
- Feature-chain delivery: tracker targets `develop`; this first API child targets the API tracker.

## Success Criteria

- [ ] Tests prove migration parity, locking, uniqueness, revocation, cleanup, key validation, digest separation, and deterministic derivation.
- [ ] Lifecycle can atomically reconcile rotations; recovery can revoke all user sessions without importing persistence entities.
- [ ] No raw refresh/CSRF secret is persisted and bearer behavior remains compatible.
- [ ] Forecast remains below 400 changed lines; otherwise tasks split the change before apply with no size exception.
