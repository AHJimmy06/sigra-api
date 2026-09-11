# Tasks: Phase 1 API Session Primitives

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 760–930 total; each slice 240–330 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Crypto, config, and readiness | PR 1 | `npm test -- --runInBand auth/session-foundation env.validation` | PostgreSQL with persisted key-version fixtures | Remove keyring/readiness providers and config wiring |
| 2 | Repositories and classification | PR 2 | `npm test -- --runInBand auth/session-foundation` | Two real PostgreSQL transactions for locks/races | Remove session/operation facades and classifier |
| 3 | Revocation, purge, and compatibility | PR 3 | `npm run test:e2e` | Compose PostgreSQL concurrent `SKIP LOCKED` purge | Remove cleanup/revocation wiring; retain schema rows |

## Phase 1: Crypto, Configuration, and Readiness

- [x] 1.1 Write RED tests in `src/auth/session-foundation/*.spec.ts` and `src/config/env.validation.spec.ts` for exact HMAC/HKDF vectors, canonical rejection, domain separation, independent keyrings, and secret prohibition.
- [x] 1.2 Implement `src/auth/session-foundation/{digest-keyring,derivation-keyring}.ts` with immutable version maps, active/retained lookup, canonical encodings, and validation errors.
- [x] 1.3 Write RED readiness tests for all five persisted key-version columns, unresolved references, and successful bootstrap resolution.
- [x] 1.4 Implement `src/auth/session-foundation/session-key-readiness.ts`, update `src/config/env.validation.ts`, and wire providers in `src/auth/auth.module.ts` without changing entities.

## Phase 2: Repositories and Classification

- [x] 2.1 Write RED PostgreSQL tests for caller-manager identity, `FOR UPDATE` blocking, rollback atomicity, and no mutation on retry/reconcile/conflict.
- [x] 2.2 Write RED classifier tests for predecessor retry, successor reconciliation, same-operation mismatch conflict, distinct-operation reuse, current, and invalid outcomes.
- [x] 2.3 Implement `src/auth/session-foundation/{types,classifier,session.repository,refresh-operation.repository}.ts` with manager-only queries and frozen precedence.
- [x] 2.4 Write RED race tests for `ON CONFLICT DO NOTHING` zero-row locked re-read and cross-session mismatch protection; then implement the conflict-safe recording path.

## Phase 3: Revocation, Cleanup, and Verification

- [x] 3.1 Write RED PostgreSQL tests for idempotent single/user-wide revocation and bounded, ordered, retention-safe concurrent purge.
- [x] 3.2 Implement `src/auth/session-foundation/cleanup.ts` and revocation methods using parameterized CTEs, operation-first deletion, positive bounds, and `SKIP LOCKED`.
- [x] 3.3 Write RED compatibility tests in `test/app.e2e-spec.ts` for unchanged bearer/role behavior and verify no raw secrets in runtime/evidence.
- [x] 3.4 Complete `src/auth/auth.module.ts` integration, run `npm test`, `npm run test:e2e`, `npm run build`, and `npm run lint`; retain dated RED-before-GREEN evidence.
