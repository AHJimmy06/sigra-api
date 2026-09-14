# Proposal: Phase 3B API Announcement Administration

## Intent

Deliver the confirmed auditable ADMIN contract while preserving Phase 3A schema ownership and historical authorship. The maintainer authorizes flexible adjacent Strict TDD RED/GREEN commits within one `size:exception` PR.

## Scope

### In Scope

- ADMIN-only list, detail, create, PATCH, and `POST /api/announcements/:id/archive`.
- Allowlisted snapshot projection; default archive exclusion, explicit read-only access, and `updatedAt DESC, id DESC` ordering.
- Strict content-or-publication PATCH classification, locking, true no-ops, first-publication timestamp, and terminal idempotent archive 200.
- Transaction-bound safe audits; immediate publication emits ordered create then publish audits.
- Unit/controller tests and real PostgreSQL HTTP, rollback, idempotency, and concurrency proof.

### Out of Scope

- 3C resident synchronization, cursors, tombstones, or events.
- 3D OpenAPI generation/proof and 3E Web work.
- Phase 3A-owned schema/entity migrations; unrelated lint debt.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `announcement-administration`: Confirmed ADMIN read, mutation, projection, lifecycle, audit, and concurrency behavior.

## Approach

Add a pure snapshot mapper and runtime PATCH classifier. Mutations and audits share one transaction; existing rows lock before edits/transitions, while no-ops return before save/audit. Creation snapshots the live author; snapshots never change; archived PATCH returns 409. Deliver the complete change in one maintainer-approved `size:exception` PR under the internal `exception-ok` strategy with flexible adjacent RED/GREEN work-unit commits.

## Delivery Strategy

The honest total forecast is 1,050–1,400 changed lines. This is one PR with `size:exception`; the size decision MUST NOT be used to compress or weaken production code, tests, reusable harness work, or runtime/PostgreSQL proof. Tests stay in the same commit as the behavior they prove.

### Internal Work-Unit Commits

| Commit | Boundary                                           | Internal forecast |
| ------ | -------------------------------------------------- | ----------------: |
| 3B.1   | Read/projection + reusable HTTP/PostgreSQL harness |           290–363 |
| 3B.2   | Create/content edit                                |           202–280 |
| 3B.3   | Lifecycle state machine                            |           181–240 |
| 3B.4   | PostgreSQL system proof                            |           305–360 |

Forecasts count additions plus deletions. The internal ranges support review and rollback planning; they are not PR limits or independent delivery/apply units. The total forecast includes cross-unit integration, correction, and review margin that is not assigned by file below.

## Affected Areas

| Area                              | Impact       | Description                                     |
| --------------------------------- | ------------ | ----------------------------------------------- |
| `src/announcements/`              | Modified/New | DTOs, mapper, routes, state machine, unit proof |
| `test/announcement-*.e2e-spec.ts` | New          | PostgreSQL HTTP/concurrency proof               |

## Risks

| Risk                         | Likelihood | Mitigation                                               |
| ---------------------------- | ---------- | -------------------------------------------------------- |
| Duplicate transitions/audits | Medium     | Transactional row locks and PostgreSQL concurrency tests |
| Accidental data exposure     | Medium     | Pure allowlisted snapshot mapper tests                   |
| No-op timestamp drift        | Medium     | Return before save/audit; assert timestamps/cardinality  |
| Review overload              | High       | One exception PR organized as flexible RED/GREEN pairs   |

## Rollback Plan

Revert internal work-unit commits in reverse order. No database rollback is required because 3B changes no schema or entity mapping.

## Dependencies

- Phase 3A schema, auth/role guards, Phase 0 errors, transaction-aware `AuditService`, and disposable PostgreSQL harness.

## Success Criteria

- [x] ADMIN routes, validation, projection, archive visibility, and lifecycle/no-op semantics match the contract.
- [x] Audits are safe, ordered, atomic, and concurrency-correct on real PostgreSQL.
- [x] One maintainer-approved `size:exception` PR preserves flexible RED/GREEN pairs, with tests beside their behavior and complete runtime/PostgreSQL proof.
