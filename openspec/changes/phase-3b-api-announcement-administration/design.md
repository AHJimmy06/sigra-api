# Design: Phase 3B API Announcement Administration

## Technical Approach

Keep Phase 3A storage/entity/migration ownership unchanged. Replace the predecessor ADMIN flow inside `src/announcements/` with an allowlisted snapshot mapper, strict PATCH pipe, and one transaction-bound locked state machine. Establish a reusable real-HTTP PostgreSQL harness in 3B.1 so 3B.4 spends its budget on proof, not duplicated setup. 3C synchronization, 3D OpenAPI proof, and 3E Web remain excluded.

## Architecture Decisions

| Decision              | Rejected option                                 | Choice and rationale                                                                                                                                       |
| --------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Projection            | Entity spread/live-user join                    | `mapAnnouncementResponse` constructs only contract fields from immutable snapshots, preserving deleted-author history and preventing ORM leakage.          |
| PATCH/state authority | Optional DTO or separate transition services    | `AnnouncementPatchPipe` emits a discriminated command; `runMutation` locks once and applies one state table, preventing divergent no-op/terminal behavior. |
| System proof          | Mocks, SQLite, or per-suite setup               | A shared production-stack PostgreSQL HTTP harness makes rollback and deterministic lock contention credible while keeping proof readable.                  |
| Delivery              | Four chained PRs or repeated SDD apply attempts | Use internal `exception-ok`: one maintainer-approved `size:exception` PR containing flexible adjacent RED/GREEN commits.                                   |

## Contracts and Data Flow

```ts
class AnnouncementAuthorResponseDto {
  id!: string;
  name!: string | null; // @ApiProperty({ nullable: true })
  email!: string;
}
type AnnouncementPatchCommand =
  | { kind: 'CONTENT'; title?: string; body?: string }
  | { kind: 'PUBLICATION'; published: boolean };
```

The mapper returns exactly `{id,title,body,status,publishedAt,authorId,author,createdAt,updatedAt}` with ISO dates. `authorId` always mirrors `authorIdSnapshot`. All-null snapshots map to `author:null`; non-null id/email map to `{id,name:authorDisplayNameSnapshot,email}`, preserving a null name. Any unexpected partial state missing id or email fails closed as `author:null`; it never consults `authorUserId` or `author`.

```text
PATCH/archive of an existing row → transaction → SELECT FOR UPDATE → classify
  no-op → map unchanged row
  change → save → await audit(s) → map → COMMIT
  error ───────────────────────────────────────→ ROLLBACK
```

Content changes preserve status/publishedAt and audit sorted changed field names without values. DRAFT→PUBLISHED first-sets publishedAt; withdrawal preserves it; target-state and repeated archive calls return unchanged without save/audit. Any PATCH on ARCHIVED throws the safe 409 registered in `src/common/http/http-error.contract.ts`. Create snapshots the transaction-loaded active user and normalized email; immediate publication awaits ordered CREATED then PUBLISHED audits. Reads use bound `ILIKE`, default `status <> ARCHIVED`, explicit archived access, identical count predicates, and `updatedAt DESC, id DESC`. Every route is ADMIN-only.

## Reusable PostgreSQL HTTP Harness

Create `test/support/announcement-administration-http-harness.ts` exporting `startAnnouncementAdministrationHttpHarness(prefix): Promise<AnnouncementAdministrationHttpHarness>`. It reuses `startDisposablePostgres`, sets isolated database/auth environment, initializes the configured `DataSource`, runs migrations, bootstraps `AppModule` through `Test` plus `configureHttpApp`, and signs persisted-user JWTs.

The returned API owns `app`, `dataSource`, `adminToken`, `tokenFor(user)`, `authorized(token?)`, `seedUser`, `seedAnnouncement`, `announcementState(id)`, `announcementCount()`, `auditRows(resourceId?)`, and `auditCount(action?, resourceId?)`. `holdAnnouncementLock(id)` returns `{waitForBlocked(count),release}`; it holds a QueryRunner transaction and polls `pg_blocking_pids` for deterministic concurrent HTTP writers. `installAuditFailure(action)` returns an idempotent `{remove}` trigger handle. `close()` aggregates app, datasource, lock/trigger, and container cleanup failures and is safe after partial startup.

## Delivery and Review Flow

The honest total forecast is 1,050–1,400 authored additions plus deletions. The maintainer approved `size:exception`, so implementation uses one PR and one SDD apply attempt. Each boundary uses adjacent RED/GREEN commits that make focused review, verification, and paired rollback possible. They are not separate PRs, and no per-commit 400-line limit applies. Tests stay with the behavior they prove; production code, tests, reusable harness work, and runtime/PostgreSQL proof are not compressed or weakened to reduce size.

```text
one size:exception PR
└── 3B.1 read/projection + reusable HTTP/PostgreSQL harness (290–363)
    └── 3B.2 create/content edit (202–280)
        └── 3B.3 lifecycle state machine (181–240)
            └── 3B.4 PostgreSQL system proof (305–360)
```

## File Changes and Internal Commit Forecasts

The internal forecasts are authored additions plus deletions and support checkpoint planning. The total delivery forecast additionally includes cross-unit integration, correction, and review margin not assigned to individual files. C=create; M=modify.

| Commit                         | Per-file forecast                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Internal forecast |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------: |
| 3B.1 Read/projection + harness | C `test/support/announcement-administration-http-harness.ts` 155–180; C `src/announcements/announcement.mapper.ts` 22–28; C `src/announcements/announcement.mapper.spec.ts` 28–36; M `src/announcements/announcement.dto.ts` 12–18; M `src/announcements/announcements.controller.ts` 10–14; C `src/announcements/announcements.controller.spec.ts` 18–24; M `src/announcements/announcements.service.ts` 20–28; M `src/announcements/announcements.service.spec.ts` 25–35 |           290–363 |
| 3B.2 Create/content            | C `src/announcements/announcement-patch.pipe.ts` 25–35; C `src/announcements/announcement-patch.pipe.spec.ts` 30–45; M `src/announcements/announcement.dto.ts` 15–22; M `src/announcements/announcements.controller.ts` 12–18; M `src/announcements/announcements.service.ts` 55–75; M `src/announcements/announcements.service.spec.ts` 65–85                                                                                                                             |           202–280 |
| 3B.3 Lifecycle                 | M `src/announcements/announcements.controller.ts` 15–22; M `src/announcements/announcements.controller.spec.ts` 25–35; M `src/announcements/announcements.service.ts` 55–75; M `src/announcements/announcements.service.spec.ts` 85–105; M `src/common/http/http-error.contract.ts` 1–3                                                                                                                                                                                    |           181–240 |
| 3B.4 PostgreSQL proof          | C `test/announcement-administration-core.e2e-spec.ts` 130–155; C `test/announcement-lifecycle.e2e-spec.ts` 175–205                                                                                                                                                                                                                                                                                                                                                         |           305–360 |

Each work-unit commit keeps its tests with the behavior they prove, records focused verification, and can be reverted without schema changes. PostgreSQL system proof remains complete in 3B.4 while using the reusable harness established in 3B.1.

## Testing Strategy

Unit tests cover mapper allowlisting/null combinations, PATCH shapes, ADMIN metadata, query/order predicates, lock options, no-ops, safe metadata, ordered audits, and transaction propagation. 3B.4 uses the harness for 401/403/404/409, CRUD/search/filter/pages, deleted authors, rollback, idempotency, and coordinated publish/withdraw/archive races. For every invalid create, query, and PATCH case (ranges, empty, unknown, mixed), tests assert the 400 envelope, then compare exact pre/post announcement rows including `updated_at`, total row count, and audit cardinality.

## Threat Matrix

| Boundary                 | Applicability | Reason                             |
| ------------------------ | ------------- | ---------------------------------- |
| Documentation-like paths | N/A           | No executable-file classification. |
| Git repository selection | N/A           | No VCS process.                    |
| Commit state             | N/A           | No commit automation.              |
| Push state               | N/A           | No push automation.                |
| PR commands              | N/A           | No PR command composition.         |

HTTP routing is covered by ADMIN, UUID, validation, and exact-route RED tests; the reference matrix has no routing row. No shell/process boundary is introduced.

## Migration / Rollout

No migration or flag. In one PR, land commits 3B.1→3B.2→3B.3→3B.4 and revert them in reverse order when a bounded rollback is required.

## Open Questions

None.
