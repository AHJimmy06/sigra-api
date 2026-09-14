# Delta for Announcement Administration

## ADDED Requirements

### Requirement: Additive author schema and ownership

Migration `AddAnnouncementAuthorSchema1724600009000` MUST be registered exactly once after 8000. It MUST leave migration-1000 objects untouched: `announcement_status`, `status announcement_status NOT NULL DEFAULT 'DRAFT'`, `author_user_id uuid NULL`, its generated `ON DELETE SET NULL` FK, `pg_trgm`, `idx_announcements_search`, and `idx_announcements_published_created`. It SHALL add only `users.display_name varchar(120) NULL`, `announcements.author_id_snapshot uuid NULL`, `author_display_name_snapshot varchar(120) NULL`, and `author_email_snapshot varchar NULL`, with matching scalar and snapshot entity mappings plus a nullable TypeORM live `User` relation joined through the existing `author_user_id`; migration 1000 MUST retain FK ownership.

It MUST add exactly these checks and predicates: `ck_users_display_name_valid`: `display_name IS NULL OR (display_name = btrim(display_name) AND char_length(display_name) BETWEEN 1 AND 120)`; `ck_announcements_author_snapshot`: `(author_id_snapshot IS NULL AND author_display_name_snapshot IS NULL AND author_email_snapshot IS NULL) OR (author_id_snapshot IS NOT NULL AND author_email_snapshot IS NOT NULL)`; `ck_announcements_live_author_matches_snapshot`: `author_user_id IS NULL OR author_user_id = author_id_snapshot`; and `ck_announcements_published_at`: `status <> 'PUBLISHED' OR published_at IS NOT NULL`. It MUST add only `idx_announcements_admin_status_updated_id(status, updated_at DESC, id DESC)` and `idx_announcements_author_user_id(author_user_id)`.

#### Scenario: Parity

- GIVEN migrations 0000–8000 have run
- WHEN 3A runs and SQL/entity metadata are inspected
- THEN types, nullability, predicates, mappings, and indexes match exactly

#### Scenario: Registration

- GIVEN the datasource contains migrations 0000–8000
- WHEN migration discovery runs
- THEN 9000 is present once after 8000, and applying it succeeds without collisions

### Requirement: Complete legacy snapshots and preserve rollback identity

3A MUST preserve migration-1000 status data and MUST NOT add or replace its FK. It MUST backfill resident-linked `users.display_name` only from `btrim(residents.name)` when trimmed length is 1–120. For every existing announcement with `author_user_id = users.id`, it MUST copy `users.id`, normalized `users.email`, and nullable `users.display_name` into snapshots. Truly unauthored or deleted-author rows (therefore `author_user_id IS NULL`) MUST remain all-null. With no intervening 3A/3B-era writes, `down` MUST drop only 3A checks, indexes, columns, and `display_name`, restoring the exact 0000–8000 catalog/data and live relation. Author-deletion retention MUST be tested in an isolated fixture or transaction restored before baseline comparison, or only after exact down comparison, so destructive proof MUST NOT invalidate equality.

#### Scenario: Completion

- GIVEN valid referenced authors and all-null unauthored/deleted-author rows
- WHEN 9000 runs
- THEN referenced rows have snapshot id/email/display name from `users`, while all-null rows remain all-null

#### Scenario: PostgreSQL proof

- GIVEN the minimal shared disposable-PostgreSQL lifecycle helper
- WHEN 0000–8000 baseline is captured, then 9000 up/down/up runs
- THEN real PostgreSQL proves checks, indexes, deletion retention, and exact down equality; mocks/metadata do not substitute

### Requirement: Stable, non-destructive seed names

Development seeding MUST use `Development Administrator` and `Development Guard` for ADMIN/GUARD, and `SEED_RESIDENT_NAME` or `Development Resident` for RESIDENT, with no new environment keys. Values MUST be trimmed and valid; invalid configured resident names MUST be rejected before writing. Existing valid names MUST be preserved; only null names may be filled. Existing-user early returns MUST perform this fill and remain idempotent without recreating resident data.

#### Scenario: Seed policy

- GIVEN existing valid, null, and invalid-name seed-user cases
- WHEN development seeding runs, including an existing-user path
- THEN valid values remain unchanged, nulls receive the policy value, invalid configuration fails before writes, and no duplicate account/unit/resident is created

### Requirement: 3B owns new-writer snapshots and projection

3A MUST provide storage, mappings, constraints, seed behavior, registration, and migration proof only. 3B MUST transactionally copy creator id, nullable display name, and email on insert, never mutate snapshots, and project `authorId` from snapshot id plus nullable `{id,name,email}` snapshot data; it MUST NOT substitute live-user values. 3A MUST NOT implement the writer or projection.

#### Scenario: Handoff

- GIVEN a matching live author and completed snapshot
- WHEN the author is deleted or only 3A is deployed
- THEN only the live FK becomes null and snapshots remain unchanged; writer/projection behavior remains a 3B obligation

### Requirement: Keep the proof reviewable

All changed lines, including tests and helper extraction, MUST remain under 400. The helper MUST expose only the shared disposable-PostgreSQL start/readiness/port/cleanup lifecycle. If the change cannot fit, tasks MUST split before implementation rather than weaken the real-PostgreSQL proof.

#### Scenario: Limit

- GIVEN the planned diff
- WHEN changed lines are measured before implementation
- THEN the total is below 400, or implementation is blocked until tasks are split
### Requirement: Safe allowlisted administration responses

Responses MUST contain id, title, plain-text body, status, publishedAt, createdAt, updatedAt, and nullable authorId plus snapshot id, name, and email. Projection MUST use immutable snapshots; legacy author fields MAY be null.

#### Scenario: Deleted or legacy author

- GIVEN a complete snapshot, deleted profile, or all-null legacy author
- WHEN an ADMIN reads the announcement
- THEN allowlisted fields use the snapshot, or nullable author fields, without sensitive data

### Requirement: ADMIN lifecycle and state rules

List, detail, create, PATCH, and POST `/api/announcements/:id/archive` MUST require ADMIN. List MUST support search, enum status, page, and pageSize; default status MUST exclude ARCHIVED, explicit ARCHIVED reads MUST be allowed, and ordering MUST be `updatedAt DESC, id DESC`. Archives are read-only. Content edits MUST preserve status and publishedAt; publishedAt MUST be first-set on publication and never cleared.

#### Scenario: Administration routes

- GIVEN a RESIDENT or unauthenticated caller
- WHEN the caller invokes any administration route
- THEN standard 401/403 response is returned

#### Scenario: List and explicit archived detail

- GIVEN draft, published, and archived announcements
- WHEN an ADMIN lists without status, lists with `status=ARCHIVED`, or reads a detail by UUID
- THEN default lists omit archives, explicit reads include them, and order is correct

### Requirement: Validation, ordering, and error contract

Title MUST be non-empty text of 5–160; body MUST be non-empty plain text of 10–2000; search MUST be ≤160; page MUST be integer ≥1; pageSize MUST be integer 1–100. PATCH MUST be non-empty, permitted-only, and either content or exactly `{published:boolean}`; mixed/unknown fields MUST be rejected. Invalid input MUST return the Phase 0 `{code,message,details,requestId}` envelope and no mutation or audit.

#### Scenario: Validation

- GIVEN an out-of-range field, empty PATCH, unknown key, or mixed PATCH body
- WHEN the request is submitted
- THEN HTTP 400 returns that envelope with no mutation or audit

#### Scenario: Strict PATCH classification

- GIVEN a valid content body or exactly `{published:boolean}`
- WHEN an ADMIN submits PATCH
- THEN the corresponding edit or lifecycle operation is selected, while any other shape is rejected

### Requirement: Transactional creation and content edits

Create/content edits and audits MUST be one transaction. Create MUST snapshot creator id, displayName, and normalized email. Draft create MUST write one `ANNOUNCEMENT_CREATED`; immediate publication MUST write ordered `ANNOUNCEMENT_CREATED`, then `ANNOUNCEMENT_PUBLISHED`. Unchanged content MUST be a no-op.

#### Scenario: Immediate publication

- GIVEN an ADMIN creates valid content with published=true
- WHEN the request commits
- THEN the resource is published with first publishedAt and exactly two ordered audits

### Requirement: Atomic, concurrency-safe audits

Every mutation of an existing announcement MUST pessimistically lock the row before evaluating state and write transaction-bound audits containing only event type, actor, changed fields, and applicable `{status:{from,to}}`; title/body values and credentials MUST NOT appear. Target-state publish/withdraw and archive repeats MUST change neither timestamps nor audit cardinality. PATCH against ARCHIVED MUST return 409.

#### Scenario: Concurrent lifecycle requests

- GIVEN concurrent publish, withdraw, or archive requests for one announcement
- WHEN both complete
- THEN locking yields one valid transition, consistent resources, and no duplicate transition audit

#### Scenario: Atomic failure

- GIVEN an audit write fails during a mutation
- WHEN the transaction aborts
- THEN the announcement and all audits remain unchanged

#### Scenario: Terminal archive

- GIVEN an archived announcement
- WHEN an ADMIN repeats POST archive or attempts PATCH
- THEN repeat archive returns HTTP 200 with the unchanged resource, while PATCH returns 409

### Requirement: Phase 3B boundary

Phase 3B MUST preserve Phase 3A schema/entity/migration ownership and MUST NOT implement resident synchronization writers, cursors, tombstones, or events from 3C, generate/prove OpenAPI from 3D, or implement 3E Web work. Delivery MUST use one maintainer-approved `size:exception` PR under the internal `exception-ok` strategy, with an honest total forecast of 1,050–1,400 changed lines. The original forecast is planning history; final observed size is 2,042 changed lines (1,897 additions + 145 deletions) in `git diff --numstat 9afc8ff..HEAD`. Historical adjacent-pair totals are 702, 387, 155, and 1,080 across the original 19 scoped paths; they are not the final-range total. Boundaries 3B.1–3B.4 MUST use flexible adjacent RED/GREEN commits for focused review, verification, and paired rollback, not separate PRs or separate SDD apply attempts. Tests MUST remain with the behavior they prove, and production code, reusable HTTP/PostgreSQL harness work, tests, and runtime/PostgreSQL proof MUST NOT be compressed or weakened because of size.

#### Scenario: Scope isolation

- GIVEN Phase 3B administration is implemented
- WHEN artifacts are reviewed
- THEN Phase 3A ownership is unchanged, no 3C writer/projector, 3D OpenAPI proof, or 3E Web work is included, the final range contains exactly 19 scoped paths, and the review history shows exactly one PR with flexible adjacent RED/GREEN work-unit commits
