# Proposal: Phase 3 API Announcement Communication

## Intent

Deliver auditable announcement administration and reliable resident synchronization, with generated OpenAPI as the immutable consumer contract.

## Scope

### In Scope

- Reconcile announcement, author profile/snapshot, feed schema, indexes, and reversible migrations.
- Define ADMIN-only listing and lifecycle behavior with safe projections and transactional audits.
- Provide one resident feed of published upserts and withdrawal/archive tombstones using an opaque versioned cursor, monotonic order, bounded limit, and `syncedAt`.
- Generate OpenAPI and prove schema parity, rollback, contracts, concurrency, idempotency, authorization, and audit atomicity.

### Out of Scope

- Push, devices, scheduling, outboxes, attachments, rich text, and delivery tracking.
- Web implementation and Mobile UI.

## Capabilities

### New Capabilities

- `announcement-administration`: Persistence and ADMIN contracts for plain-text content, authors, lifecycle, archive visibility, authorization, and audit.
- `resident-announcement-sync`: Resident change feed, cursor, upsert, tombstone, watermark, validation, and ordering contracts.

### Modified Capabilities

None.

## Approach

Add reversible TypeORM schema support and allowlisted DTOs. Persist display names and author snapshots with safe nullability for legacy or deleted authors. Use row locks; edits preserve state and first `publishedAt` forever. Immediate publication emits separate create and publish audits. Idempotent terminal `POST /api/announcements/:id/archive` returns HTTP 200. Archives are excluded by default and read-only through an explicit status filter.

Back the opaque versioned cursor with persisted monotonic change order. Invalid cursors return `400 CURSOR_INVALID`; Phase 3 cursors do not expire. Forecast sub-400-line review slices: schema/profile, admin behavior/audit, resident sync, and OpenAPI/proof. Tests remain with each slice.

## Affected Areas

| Area                                                                | Impact   | Description                                            |
| ------------------------------------------------------------------- | -------- | ------------------------------------------------------ |
| `src/announcements/`                                                | Modified | Persistence, DTOs, lifecycle, resident feed            |
| `src/users/`, `src/migrations/`, `src/config/typeorm.datasource.ts` | Modified | Display name, snapshots, feed order, indexes, rollback |
| `src/audit/`                                                        | Modified | Safe atomic event semantics                            |
| `src/openapi/`, `docs/openapi/v1.json`                              | Modified | Immutable consumer contract                            |
| `src/**/*.spec.ts`, `test/`                                         | Modified | Unit, E2E, migration, concurrency, contract proof      |

## Risks

| Risk                                 | Likelihood | Mitigation                                                 |
| ------------------------------------ | ---------- | ---------------------------------------------------------- |
| Cursor gaps or duplicate transitions | Medium     | Persist monotonic order; lock rows; test concurrent writes |
| Legacy author/schema drift           | Medium     | Nullable snapshots, migration parity, reversal             |
| Review overload                      | High       | Deliver proof-bearing slices within the 400-line policy    |

## Rollback Plan

Revert endpoints, feed, and generated OpenAPI; run migration down to remove Phase 3 additions while preserving pre-existing announcements.

## Dependencies

- Existing bearer/role guards, Phase 0 error envelope, transactional audit service, PostgreSQL/TypeORM, and OpenAPI generator.

## Success Criteria

- [ ] Admin lifecycle and resident synchronization satisfy all confirmed wire, ordering, idempotency, and audit rules.
- [ ] Migration up/down, concurrency, authorization, E2E, and generated OpenAPI checks pass without reducing proof scope.
