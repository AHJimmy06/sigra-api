## Exploration: Phase 3 API announcement communication

### Current State

The API already has a NestJS `announcements` module registered under the global `/api` prefix. It exposes `GET/POST /api/announcements` and `PATCH/DELETE /api/announcements/:id`, uses bearer authentication plus role guards, validates create/update fields, performs offset pagination and title/body search, and writes audit rows in the same TypeORM transaction as mutations. The entity already declares `DRAFT | PUBLISHED | ARCHIVED`, `publishedAt`, `authorUserId`, and timestamps. Phase 0 supplies a stable `{ code, message, details, requestId }` error envelope and generated OpenAPI artifact checks.

The implementation does not yet satisfy the Phase 3 roadmap contract:

| Contract area          | Current behavior                                                                                         | Gap                                                                                                                                                                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Administrative listing | One route permits both `ADMIN` and `RESIDENT`; order is `createdAt DESC, id DESC`.                       | The administrative route must be ADMIN-only and order by `updatedAt DESC, id DESC`.                                                                                                                                                                |
| Resident delivery      | Residents reuse offset-paginated `/api/announcements`; the service filters to `PUBLISHED`.               | There is no `/api/resident/announcements`, opaque cursor, synchronization watermark, or withdrawal reconciliation.                                                                                                                                 |
| Persistence            | The entity expects status and author columns.                                                            | The initial migration creates neither `announcement_status` nor `status`/`author_user_id`; `synchronize` is disabled, so a clean migrated database cannot support the current entity. No supporting list/sync indexes or author foreign key exist. |
| Author contract        | Responses expose `authorUserId` and synthesize both author name and email from `users.email`.            | The roadmap calls for `authorId` and a real `{ id, name, email }`; `users` has no administrator display-name field. Historical author retention is undefined.                                                                                      |
| State transitions      | PATCH can move any row to draft/published; DELETE always saves `ARCHIVED` and returns 204.               | Archived terminality/restoration, response status, and allowed transition matrix are undefined. Repeated publish/withdraw/archive operations still save and/or audit, so required idempotency is not met.                                          |
| Editing                | Partial field validation exists.                                                                         | `{}` is accepted and audited; changed fields and safe before/after metadata are not recorded.                                                                                                                                                      |
| Publication history    | First publication sets `publishedAt`; withdrawal retains it.                                             | A first-time publish audit can replace the creation audit, and repeated publication becomes `ANNOUNCEMENT_UPDATED`. Required event semantics are ambiguous.                                                                                        |
| OpenAPI                | Existing collection success schema and Phase 0 errors are generated.                                     | PATCH/DELETE success contracts, role-specific resident sync schemas, cursor parameters, transition semantics, and exact announcement query/response assertions are absent.                                                                         |
| Testing                | Four service tests cover timestamp preservation, withdrawal, role filtering, and safe author projection. | No announcement controller/E2E, migration parity, authorization matrix, stable ordering, validation detail, idempotency, transactional audit, XSS-boundary, or resident synchronization tests exist.                                               |

No push-notification, device-token, delivery-attempt, outbox, or post-commit dispatch capability exists. Those are explicitly future work in the roadmap and should not be smuggled into this change.

### Affected Areas

- `src/announcements/announcement.entity.ts` — align the persisted announcement model, author relation/history policy, state, and synchronization indexes.
- `src/migrations/` and `src/config/typeorm.datasource.ts` — add and register a reversible migration from the actual initial announcement table; prove metadata/schema parity.
- `src/announcements/announcement.dto.ts` — freeze allowlisted administrative and resident response models, non-empty updates, pagination, cursor, and synchronization fields.
- `src/announcements/announcements.controller.ts` — make administrative routes ADMIN-only and document exact success/error responses.
- `src/announcements/announcements.service.ts` — enforce transition/idempotency rules, deterministic ordering, safe projections, audit metadata, and synchronization behavior.
- `src/announcements/announcements.module.ts` and potentially a resident-facing controller — expose a distinct resident route without coupling its contract to administrative offset pagination.
- `src/users/user.entity.ts`, seed data, and a migration — affected only if Phase 3 requires a real administrator display name rather than the current email fallback.
- `src/audit/audit.service.ts` and `src/audit/audit-log.entity.ts` — reusable transaction-bound audit mechanism; likely no schema change, but announcement event semantics and safe metadata must be specified.
- `src/common/non-empty-patch.pipe.ts`, `src/common/pagination.dto.ts`, and `src/common/http/*` — reusable non-empty PATCH, pagination validation, and Phase 0 error patterns.
- `src/openapi/generate-openapi.ts`, `src/openapi/openapi-artifact.spec.ts`, and `docs/openapi/v1.json` — register/document any new controller and lock the cross-repository wire contract.
- `src/announcements/announcements.service.spec.ts`, new controller/E2E tests, and migration tests — expand proof to all mandatory roadmap behavior.
- `/home/jimmy/UTA/PFWYM/sigra-web/src/pages/AnnouncementsPage.tsx` — separate Web change that currently consumes offset pagination and a transitional optional `status`, `updatedAt`, and `author`; it has no archive action and defines its DTO locally.
- `/home/jimmy/UTA/PFWYM/sigra-web/src/api/contracts.ts` — separate Web change should own the finalized typed API contract rather than continuing a page-local interface.

### Approaches

1. **Harden the existing module and add a distinct resident synchronization boundary** — keep administrative offset pagination, add an ADMIN-only contract, and introduce a resident-specific cursor/synchronization DTO and route backed by explicit withdrawal reconciliation.
   - Pros: Reuses the current module, guards, audit transaction pattern, Phase 0 errors, and OpenAPI pipeline while separating admin UI pagination from mobile synchronization semantics.
   - Cons: Requires a migration and a precise cursor/tombstone contract; may require a user display-name decision.
   - Effort: Medium

2. **Keep one role-sensitive collection route** — retain `/api/announcements` for both roles and add cursor parameters/conditional response behavior there.
   - Pros: Smallest controller change and maximum reuse of the current service.
   - Cons: Conflicts with the roadmap's ADMIN-only list and dedicated resident endpoint, creates role-dependent response shapes, and makes OpenAPI/client evolution brittle.
   - Effort: Low initially, high contract risk

3. **Introduce a communication event/outbox subsystem now** — model publication/withdrawal events as a durable feed and prepare post-commit notification delivery.
   - Pros: Strong synchronization history and a clean future push-notification foundation.
   - Cons: Substantially expands schema, operations, testing, and review scope beyond current Phase 3; premature without delivery-channel requirements.
   - Effort: High

### Recommendation

Use approach 1 with this bounded API scope:

1. Reconcile the existing table with a reversible migration for explicit state, original author ownership, required constraints/FK policy, and deterministic admin/resident query indexes.
2. Keep `GET /api/announcements?search=&status=&page=&pageSize=` strictly ADMIN-only with `updatedAt DESC, id DESC`; keep POST/PATCH/archive mutations ADMIN-only.
3. Treat editing content as preserving the current publication state. Reject empty PATCH requests. Make publish, withdraw, and archive true no-ops when already in the target state: no timestamp change and no duplicate audit event.
4. Treat `ARCHIVED` as terminal within this change unless product explicitly asks for restore. Prefer a logical archive command returning the updated resource (for consistency with existing Phase 2 archive lifecycle) over the current bodyless 204, but freeze the exact route before proposal.
5. Record creation independently from publication when one request performs both, and record only safe metadata: changed field names and status transitions, not full body content or authentication data.
6. Define resident synchronization independently from admin pagination. The safest bounded contract is an opaque cursor over a deterministic change order and a response that can represent published upserts plus withdrawal/archive tombstones; a published-only snapshot cannot make already-synchronized clients hide withdrawals.
7. Define announcement content as plain text. The API validates length and returns text; Web/Mobile clients must render it as text, never injected HTML. Do not add HTML sanitization or rich text in this phase.
8. Add unit, controller/E2E, migration parity/reversal, OpenAPI artifact, authorization, audit atomicity/idempotency, and synchronization tests. Do not add devices, push providers, delivery logs, outbox workers, scheduling, or notification dispatch.

#### Exact API-to-Web contract handoff

The API change should publish the generated OpenAPI artifact and freeze these Web-consumed facts: ADMIN bearer role; paths and methods; `search/status/page/pageSize`; stable admin order; status enum; title/body limits; non-empty PATCH; archive command and response status; ISO UTC timestamps; `authorId` plus nullable/non-null author policy; paginated envelope; Phase 0 errors; no-op semantics; and plain-text rendering requirement. A separate Web OpenSpec change in the Web repository should then replace the page-local interface with shared API contract types, consume the finalized archive/author fields, remove transitional optional fields, and add UI contract tests. The API change must not edit Web files, and the Web change must not redefine server transition or synchronization rules. Mobile resident cursor/tombstone fields are an API-to-Mobile handoff, not a requirement for the current administrative Web page.

#### Product decisions required before proposal

- **Resident sync shape:** choose snapshot-only plus a separate changes endpoint, or one change feed containing upserts and tombstones; define opaque cursor encoding/versioning, ordering, page limit, `syncedAt` watermark, cursor expiry, and invalid-cursor error behavior.
- **Archive command:** choose `DELETE /api/announcements/:id` or `POST /api/announcements/:id/archive`, and choose 200 resource response versus 204. Recommendation: explicit POST and 200 for logical, idempotent state change.
- **Archived transitions:** confirm archived is terminal and cannot be edited, published, or withdrawn in Phase 3; otherwise specify restore behavior.
- **Author identity:** choose a real user display-name field/profile migration, a persisted author snapshot, or formally accept email as display name. Also decide whether `authorId` is nullable for legacy rows and what happens when an author account is archived/deleted.
- **Audit event cardinality:** confirm whether create-with-`published=true` emits both `ANNOUNCEMENT_CREATED` and `ANNOUNCEMENT_PUBLISHED` (recommended) and whether changed-field metadata excludes old/new title/body values (recommended).
- **Concurrent mutation policy:** choose row locking and serialized transitions, or optimistic concurrency with a version/`updatedAt` precondition. At minimum, prevent duplicate transition audits under concurrent publish/withdraw/archive requests.
- **Historical publication timestamp:** confirm `publishedAt` means first publication forever (current behavior/recommendation) rather than latest publication.

### Risks

- The current entity/migration drift is a release blocker: code can compile and unit tests can pass while migrated production schema lacks required columns and enum type.
- A snapshot that returns only currently published rows cannot communicate withdrawals to offline clients; claiming incremental synchronization without tombstones or a changes endpoint would lose correctness.
- Offset pagination ordered by mutable `updatedAt` is suitable for the admin UI but not a reliable mobile synchronization cursor.
- Concurrent state changes can duplicate or misorder audits unless the announcement row is locked or optimistic concurrency is specified.
- Adding a real author name broadens schema and seed scope; retaining email-as-name fails the roadmap's semantic intent even though the wire shape exists.
- Returning entity spreads risks accidental future field exposure; explicit allowlisted projections should be used for both admin and resident contracts.
- The roadmap's XSS requirement spans repositories: the API can define plain text, but consumer rendering safety must be verified in separate Web/Mobile changes.
- The complete API work may exceed the 400-line review budget once migration, synchronization, OpenAPI, and E2E proof are included; proposal/tasks should forecast a schema/contract slice and a behavior/proof slice if needed.

### Ready for Proposal

No. The bounded direction is clear, but proposal must wait for the seven product decisions above—especially resident withdrawal synchronization, archive wire semantics, author identity, and concurrent transition policy. Once resolved, the proposal should own only API persistence/contracts/behavior/proof and declare generated OpenAPI as the exact handoff to separate Web and future Mobile changes; push notifications remain explicitly out of scope.
