# Delta for Announcement Administration

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Phase 3B boundary

Phase 3B MUST preserve Phase 3A schema/entity/migration ownership and MUST NOT implement resident synchronization writers, cursors, tombstones, or events from 3C, generate/prove OpenAPI from 3D, or implement 3E Web work. Delivery MUST use one maintainer-approved `size:exception` PR under the internal `exception-ok` strategy, with an honest total forecast of 1,050–1,400 changed lines. The original forecast is planning history; final observed size is 2,042 changed lines (1,897 additions + 145 deletions) in `git diff --numstat 9afc8ff..HEAD`. Historical adjacent-pair totals are 702, 387, 155, and 1,080 across the original 19 scoped paths; they are not the final-range total. Boundaries 3B.1–3B.4 MUST use flexible adjacent RED/GREEN commits for focused review, verification, and paired rollback, not separate PRs or separate SDD apply attempts. Tests MUST remain with the behavior they prove, and production code, reusable HTTP/PostgreSQL harness work, tests, and runtime/PostgreSQL proof MUST NOT be compressed or weakened because of size.

#### Scenario: Scope isolation

- GIVEN Phase 3B administration is implemented
- WHEN artifacts are reviewed
- THEN Phase 3A ownership is unchanged, no 3C writer/projector, 3D OpenAPI proof, or 3E Web work is included, the final range contains exactly 19 scoped paths, and the review history shows exactly one PR with flexible adjacent RED/GREEN work-unit commits
