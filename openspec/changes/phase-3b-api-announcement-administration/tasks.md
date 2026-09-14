# Tasks: Phase 3B API Announcement Administration

## Review Workload Forecast

| Field                   | Value                                        |
| ----------------------- | -------------------------------------------- |
| Estimated changed lines | 1,050–1,400                                  |
| 400-line budget risk    | High; size exception approved                |
| Chained PRs recommended | No; exactly one PR                           |
| Suggested split         | Single PR, flexible adjacent RED/GREEN pairs |
| Delivery strategy       | exception-ok                                 |
| Chain strategy          | size-exception                               |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal                                    | Likely PR | Focused test command                                                                                                        | Runtime harness                                                                     | Rollback boundary                                                                              |
| ---- | --------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 3B.1 | DTO/projection, reads, reusable harness | Single PR | `npm test -- --runInBand src/announcements/*.spec.ts`                                                                       | `npm run test:e2e -- --runInBand test/announcement-administration-core.e2e-spec.ts` | Revert mapper/read/harness files only                                                          |
| 3B.2 | Create and content transactions         | Single PR | `npm test -- --runInBand src/announcements/announcement-patch.pipe.spec.ts src/announcements/announcements.service.spec.ts` | Harness create/PATCH scenarios; close API in `afterAll`                             | Revert create/content behavior and tests                                                       |
| 3B.3 | Locked lifecycle and terminal rules     | Single PR | `npm test -- --runInBand src/announcements/*.spec.ts`                                                                       | Harness publish/withdraw/archive races                                              | Revert lifecycle/error-contract behavior                                                       |
| 3B.4 | PostgreSQL HTTP/system proof            | Single PR | `npm run test:e2e -- --runInBand test/announcement-administration-core.e2e-spec.ts test/announcement-lifecycle.e2e-spec.ts` | Real disposable PostgreSQL; `await api.close()` in `finally`                        | Revert the 3B.4 test/artifact commits together: system-proof suites and six OpenSpec artifacts |

## Phase 1: 3B.1 Read, Projection, and Harness

- [x] 1.1 RED: add mapper tests for exact allowlist, ISO dates, snapshot author/null/partial/deleted-author safety; then create `src/announcements/announcement.mapper.ts` and update `announcement.dto.ts`.
- [x] 1.2 RED: add controller/service tests for ADMIN 401/403, UUID/validation 400, search/status/page/pageSize, archive exclusion, explicit archive detail, count predicates, and `updatedAt DESC, id DESC`; then update `announcements.controller.ts` and `announcements.service.ts`.
- [x] 1.3 Create `test/support/announcement-administration-http-harness.ts` using `startDisposablePostgres`, migrations, `Test`/`configureHttpApp`, JWT users, seed/state/audit helpers, lock holder, audit-failure trigger, and aggregate idempotent cleanup; commit **3B.1**.

## Phase 2: 3B.2 Create and Content Transactions

- [x] 2.1 RED: specify permitted content versus exactly `{published:boolean}`, rejecting empty/unknown/mixed shapes with the Phase 0 envelope and unchanged rows/audits; create `announcement-patch.pipe.spec.ts` and `announcement-patch.pipe.ts`.
- [x] 2.2 RED then implement create/content service/controller tests and behavior: creator snapshot/normalized email, draft CREATED, immediate ordered CREATED→PUBLISHED, preserved status/publishedAt, changed-field-only safe audits, and true content no-ops; commit **3B.2**.

## Phase 3: 3B.3 Lifecycle State Machine

- [x] 3.1 RED: add tests for one-lock mutation authority, target-state publish/withdraw no-ops, first publication timestamp, withdrawal preservation, archived PATCH 409, and repeated archive 200 without save/audit.
- [x] 3.2 Implement locked `runMutation` lifecycle transitions, transaction-bound audit metadata, archive route, and registered safe 409 in `src/common/http/http-error.contract.ts`; commit **3B.3**.

## Phase 4: 3B.4 PostgreSQL Proof and Scope Gate

- [x] 4.1 Add `test/announcement-administration-core.e2e-spec.ts` covering all CRUD/search/filter/page, auth, projection, validation, no-op, immediate-publication, rollback, and exact audit scenarios; always close harness in `finally`.
- [x] 4.2 Add `test/announcement-lifecycle.e2e-spec.ts` with deterministic `pg_blocking_pids` lock contention, concurrent publish/withdraw/archive, terminal idempotency, atomic audit failure, row/timestamp/cardinality comparisons, and cleanup assertions; commit **3B.4**.
- [x] 4.3 Run `npm test -- --runInBand`, `npm run test:e2e -- --runInBand test/announcement-*.e2e-spec.ts`, `npm run build`, and `npm run lint`; verify no 3C/3D/3E files or Phase 3A schema/entity/migration changes. Revert commits in reverse order for rollback.
