## Exploration: Phase 3B API announcement administration

### Current State

Phase 3A is present through `9afc8ff`. `Announcement` now maps the migration-backed `DRAFT | PUBLISHED | ARCHIVED` state, first-publication timestamp, nullable live `User` relation, and immutable author snapshot columns. Migration `1724600009000-AddAnnouncementAuthorSchema.ts` owns only the profile/snapshot columns, checks, and admin/author indexes; migration 1000 still owns `announcement_status`, `status`, `author_user_id`, its `ON DELETE SET NULL` foreign key, `pg_trgm`, and the original announcement indexes. Phase 3B requires no migration or entity change.

The current `/api/announcements` implementation is a partial predecessor, not the confirmed contract. `AnnouncementsController` permits RESIDENT list access, has no detail route, accepts empty or mixed PATCH bodies, and archives with `DELETE`/204. `AnnouncementsService` orders by creation time, includes archived rows by default, reads live email as the author name, spreads entities into responses, does not write snapshots on create, emits only one audit for immediate publication, does not lock rows, saves/audits no-ops, and allows archived restoration through PATCH. Existing announcement proof is only four mocked service tests.

### Affected Areas

- `src/announcements/announcement.dto.ts` — retain create/list validation, replace the response's `authorUserId` with snapshot-derived `authorId`, make author fields nullable as required by legacy data, and support strict PATCH classification.
- `src/announcements/announcement.mapper.ts` — recommended new pure allowlisted mapper; project only declared response fields from immutable snapshots and never spread an entity or substitute live profile values.
- `src/announcements/announcements.controller.ts` — make the controller ADMIN-only; add `GET :id`; apply non-empty and content-versus-transition PATCH validation; replace DELETE with idempotent `POST :id/archive` returning 200.
- `src/announcements/announcements.service.ts` — implement snapshot-backed list/detail/create, deterministic admin ordering, transactional author capture, locked/no-op-aware edits and transitions, terminal archive, and transaction-bound audit cardinality.
- `src/announcements/announcements.module.ts` — expected unchanged; `Announcement` is already registered, `AuthModule` is imported, and global `AuditModule` supplies `AuditService`.
- `src/announcements/announcement.entity.ts` and `src/users/user.entity.ts` — read-only dependencies supplied by 3A; no 3B schema or mapping edits should be needed.
- `src/audit/audit.service.ts` and `src/audit/audit-log.entity.ts` — expected unchanged; `AuditService.record(EntityManager, event)` already guarantees use of the caller's transaction and stores actor/action/resource/safe JSON metadata.
- `src/migrations/1724600001000-AddAuditLogs.ts` — retains ownership of status, live author FK, `pg_trgm`, and original announcement indexes; do not edit in 3B.
- `src/migrations/1724600009000-AddAnnouncementAuthorSchema.ts` and `src/config/typeorm.datasource.ts` — retain Phase 3A ownership/registration; no 3B migration is justified.
- `src/common/non-empty-patch.pipe.ts` and `src/common/http/configure-http-app.ts` — reuse the non-empty PATCH assertion and global transform/whitelist/forbid-unknown validation behavior.
- `src/announcements/announcement.dto.spec.ts`, `src/announcements/announcement.mapper.spec.ts`, `src/announcements/announcements.service.spec.ts`, `src/announcements/announcements.controller.spec.ts` — focused contract, mapping, transaction, state-machine, and controller unit proof; three files are new.
- `test/announcement-administration-core.e2e-spec.ts` and `test/announcement-lifecycle.e2e-spec.ts` — recommended real-HTTP/PostgreSQL proof using `test/support/disposable-postgres.ts`; both are new.

### Approaches

1. **Explicit mapper plus one locked service state machine** — keep the confirmed routes in the existing module, classify PATCH as either content edit or exact `{published:boolean}`, centralize immutable snapshot projection, and perform each mutation and audit set in one `DataSource.transaction`.
   - Pros: Small architectural surface; explicit response allowlist; one transition authority; naturally enforces atomicity, no-op behavior, and future 3C writer integration without implementing the feed now.
   - Cons: Requires careful transaction tests and a dedicated PATCH classifier because Nest validation does not validate TypeScript unions at runtime.
   - Effort: High

2. **Separate publish/withdraw services or routes** — split content and lifecycle commands into separate methods/controllers.
   - Pros: Simpler DTOs and smaller methods.
   - Cons: Violates the confirmed single-PATCH wire contract, duplicates locking/load/audit logic, and creates avoidable contract churn before OpenAPI proof.
   - Effort: Medium, but contract-incompatible

### Recommendation

Use approach 1. Make `AnnouncementsController` ADMIN-only and expose list, detail, create, PATCH, and `POST :id/archive`. List must apply `status <> ARCHIVED` when no status is supplied, allow explicit `status=ARCHIVED`, and order by `updatedAt DESC, id DESC`; a detail lookup by UUID is itself explicit and may return an archived read-only representation.

Creation should read the live creator inside the transaction, copy `id`, `displayName`, and normalized email into all three snapshots, and return only the snapshot projection. A draft create writes `ANNOUNCEMENT_CREATED`; immediate publication writes `ANNOUNCEMENT_CREATED` and then `ANNOUNCEMENT_PUBLISHED` as two audit rows in the same transaction. The 3A constraint prevents a live author id without a matching snapshot id.

PATCH must reject empty, unknown, and mixed content/publication bodies. Content edits preserve status and `publishedAt`; unchanged content is a true no-op. Publication uses a pessimistic write lock: DRAFT→PUBLISHED sets `publishedAt` only when null, PUBLISHED→DRAFT preserves it, target-state repeats are no-ops, and every PATCH against ARCHIVED returns 409. Archive locks the row, maps DRAFT/PUBLISHED→ARCHIVED with one audit, and returns the existing resource unchanged with 200 on repeats. Audit metadata should contain only changed field names and, when applicable, `{status:{from,to}}`; never title/body values or credentials.

#### Honest delivery boundaries and line forecast

Forecast: **1,050–1,400 changed lines** across runtime code, replacement unit tests, and real PostgreSQL HTTP/concurrency proof. The maintainer approved one `size:exception` PR under `exception-ok`; flexible adjacent RED/GREEN pairs keep the internal work units reviewable without creating chained PRs. `announcements.service.spec.ts` is already 168 lines and adjacent administration E2E proof is 354 lines, so compressing the full scope below 400 would weaken verification.

Use one PR with the following flexible paired boundaries:

1. **3B.1 Read contract and projection (260–360 lines)** — DTO/classifier foundation, allowlisted snapshot mapper, ADMIN-only list/detail, default archive exclusion, ordering, and focused unit/controller tests.
2. **3B.2 Create and content edit (300–390 lines)** — transactional live-profile snapshot capture, separate immediate-publish audits, locked content edit/no-op behavior, and focused service/HTTP proof.
3. **3B.3 Lifecycle state machine (300–390 lines)** — publish/withdraw/archive routes and locking, terminal/idempotent rules, first `publishedAt`, safe audit metadata/cardinality, and unit proof.
4. **3B.4 PostgreSQL system proof (280–390 lines)** — authorization, exact validation envelope, deleted-author projection, concurrent transitions, idempotency, and forced transaction rollback against disposable PostgreSQL.

Each boundary must retain its own tests. The approved exception covers the cohesive total; do not compress tests or production code to satisfy the budget.

#### Test strategy

- DTO/classifier unit tests: exact create bounds; enum/page/search validation; empty, unknown, and mixed PATCH rejection; content or exact publication acceptance.
- Mapper unit tests: complete snapshot, nullable snapshot name, deleted live author, all-null legacy author, date serialization, and explicit absence of password/live ORM/internal fields.
- Service unit tests: query predicates/order, detail 404, snapshot creation, two immediate-publish audits, changed-field metadata, all legal transitions, archived 409, no-op save/audit/timestamp invariants, and transaction rollback propagation.
- Controller tests: ADMIN role metadata and exact route/method/status delegation, especially detail and POST archive.
- Core HTTP/PostgreSQL E2E: 401/403, validation envelopes, create/edit/list/detail, search/status/pagination/order, default archive exclusion, explicit archived listing, author deletion retention, and response allowlists.
- Lifecycle PostgreSQL E2E: concurrent publish requests produce one transition audit; withdraw/archive races serialize; repeated publish/withdraw/archive do not change `updatedAt` or audit count; immediate publication creates exactly two ordered audits; forced audit failure rolls back the announcement mutation.
- Run focused unit suites plus both E2E files. Do not regenerate or assert OpenAPI in 3B; that belongs to 3D.

#### Product decisions status

All decisions needed for this child are confirmed: pessimistic row locking; first-publication `publishedAt`; content edits preserve state; archive is terminal/idempotent POST 200; immediate publication emits create and publish audits; archived rows are excluded by default and explicitly readable but immutable; author snapshots are immutable and are the API projection source, while clients display only name. No additional product decision is required for proposal, provided detail-by-id is treated as an explicit read.

#### Research lanes

No research lane is selected. The work uses established repository, NestJS, TypeORM, PostgreSQL, audit, and E2E patterns, and all behavior choices are product-confirmed. External evidence would not resolve an open 3B decision.

### Risks

- TypeORM pessimistic locks work only inside a real transaction; mocked repository tests cannot prove concurrent audit cardinality.
- `UpdateDateColumn` changes on every save, so no-op branches must return before `save` and before `AuditService.record`.
- The current mapper spreads entities and joins live email; retaining either behavior would violate both allowlisting and immutable historical attribution.
- The guard reloads an active user but does not expose `displayName`; creation must query the user through the transaction rather than trust JWT claims.
- Immediate publication must persist two audit rows atomically and in deterministic call order, not choose one action conditionally as today.
- `status=ARCHIVED` must bypass only the collection's default exclusion; ARCHIVED mutation remains forbidden on every command.
- Current unit tests encode obsolete RESIDENT-list and live-email behavior and must be replaced rather than extended blindly.
- Review-budget risk is high; this is one maintainer-approved `size:exception` PR, not a chained-PR plan.

### Ready for Proposal

Yes. The proposal freezes the recommended snapshot mapper, single-PATCH classifier/state machine, list/detail archive-read semantics, transactional audit metadata, and four flexible adjacent RED/GREEN boundaries in one exception PR. It explicitly excludes resident sync/cursor/change events (3C), OpenAPI generation/proof (3D), and Web work (3E).
