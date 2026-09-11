# Tasks: Phase 1 API Session Schema

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 160–240 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Delivery strategy | feature-branch-chain child slice |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: feature-branch-chain
400-line budget risk: Low

This child targets the API-session tracker branch, not `main`. Its work unit remains limited to schema parity and reversible migration evidence.

## Phase 1: Schema Parity

- [x] 1.1 RED first: extend `src/config/typeorm-metadata.spec.ts` with failing parity assertions for the two tables, every column type/nullability/default/check/FK/uniqueness rule, and all required indexes; add a failing clean-database forward/reverse migration test that proves operations drop before sessions and pre-existing schema remains.
- [x] 1.2 GREEN only after recorded RED failures: create the secret-free `auth_sessions` and `refresh_operations` entities, handwritten reversible migration, and datasource registration in `src/auth/**/*.entity.ts`, `src/migrations/*session*`, and `src/config/typeorm.datasource.ts` required by R1 and R6 only.
- [x] 1.3 REFACTOR only after GREEN: deduplicate parity fixtures/assertions while retaining the full DDL contract, then rerun focused parity and clean-database forward/reverse migration evidence.
- [x] 1.4 Record focused parity and forward/reverse migration results, confirm no raw-secret columns, and archive this child change before runtime primitives begin.

## Strict TDD Execution Plan

| Stage | Test-first proof required before the next stage | Later production paths gated by the proof |
|---|---|---|
| RED | Failing metadata/index parity tests prove absent or mismatched entities, constraints, and indexes; failing clean-database migration tests prove the missing forward/reverse lifecycle. | `src/auth/**/*.entity.ts`, `src/migrations/*session*`, `src/config/typeorm.datasource.ts`, `src/config/typeorm-metadata.spec.ts` |
| GREEN | Focused parity suite passes after the minimal entity, migration, registration, and test-support changes; clean-database migration applies and reverses cleanly. | No additional production path until both results are recorded. |
| REFACTOR | Focused parity suite and migration lifecycle remain green after only test-fixture or expectation deduplication. | No DDL constraint or index may be removed or weakened. |

## Planned DDL Preservation Checklist

- `auth_sessions`: UUID primary key; cascading user foreign key; unique 32-byte `current_refresh_digest`; non-negative generation; canonical ASCII version fields; absolute expiry; optional revocation; and non-null `now()` created/updated timestamps.
- `refresh_operations`: UUID primary key; cascading session foreign key; UUID operation identifier; 32-byte `presented_digest`; canonical ASCII version fields; non-negative result generation; expiry; and non-null creation timestamp.
- Indexes and uniqueness: current-digest uniqueness, user-revocation, `(absolute_expires_at, id)`, `(session_id, operation_id)` uniqueness, presented-digest lookup, and `(expires_at, id)`.

## Work Unit Evidence

| Evidence | Required value |
|---|---|
| Focused test command | `npm test -- --runInBand config/typeorm-metadata.spec.ts` |
| Runtime harness | `npm run db:dev:up && npm run migration:run && npm run migration:revert && npm run db:dev:down` |
| Rollback boundary | Schema entities, migration registration, handwritten migration, and parity tests; reverse drops operations before sessions. |

For this planning-only task, the runtime harness is N/A: no executable runtime boundary, database object, or application behavior is created. The later schema apply task must run the listed migration lifecycle command.
