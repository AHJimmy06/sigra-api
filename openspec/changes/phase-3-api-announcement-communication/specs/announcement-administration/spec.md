# Announcement Administration Specification

## Purpose

Define the migrated, auditable, ADMIN-only announcement lifecycle and its safe HTTP contract.

## Requirements

### Requirement: Reversible announcement persistence

The schema MUST match the entity after migration, including nullable author identity/snapshot, DRAFT/PUBLISHED/ARCHIVED state, first-publication timestamp, constraints, foreign-key policy, and admin/search/feed indexes. Migration up and down MUST be repeatable and preserve pre-existing announcements while removing only Phase 3 additions.

#### Scenario: Migration parity and rollback

- GIVEN a clean database and the application metadata
- WHEN migration up then migration down is executed
- THEN metadata matches the migrated schema, and pre-existing announcement data remains after down

### Requirement: Safe allowlisted administration responses

Responses MUST expose only id, title, plain-text body, status, publishedAt, createdAt, updatedAt, and an author projection containing nullable authorId plus profile/snapshot id, name, and email as applicable. They MUST NOT expose password, tokens, internal ORM fields, audit secrets, or arbitrary entity fields. Author display names MUST come from the profile and the persisted historical snapshot MUST remain usable when the profile is deleted; legacy rows MAY have null author identity/snapshot.

#### Scenario: Deleted or legacy author

- GIVEN an announcement whose profile is deleted, or a legacy row without an author
- WHEN an ADMIN reads it
- THEN the response uses the retained snapshot or null author fields and contains no sensitive fields

### Requirement: ADMIN lifecycle and state rules

The list, create, edit, publish, withdraw, and `POST /api/announcements/:id/archive` operations MUST require ADMIN. List MUST support `search`, enum `status`, `page`, and `pageSize`, default exclude ARCHIVED, and order by `updatedAt DESC, id DESC`. Archive MUST be terminal, read-only when explicitly listed, idempotent, and return HTTP 200 with the resource. Edits MUST preserve state. `publishedAt` MUST be set only on first publication and never cleared.

#### Scenario: Authorized lifecycle

- GIVEN an ADMIN and a DRAFT announcement
- WHEN the ADMIN creates with immediate publication, edits, withdraws, then archives
- THEN create and publish audits are distinct, state transitions are correct, first `publishedAt` remains, and archive returns 200

#### Scenario: Authorization and terminal archive

- GIVEN a RESIDENT or an ARCHIVED announcement
- WHEN the caller lists/mutates, or repeats archive
- THEN the resident receives the standard 403, archived mutation is rejected, and repeated archive returns the same 200 resource without a new transition audit

### Requirement: Validation, ordering, and error contract

Title MUST be non-empty text of 5–160 characters; body MUST be non-empty plain text of 10–2000 characters; search MUST be at most 160 characters; page MUST be an integer ≥1; pageSize MUST be an integer 1–100; PATCH MUST contain at least one permitted field. Invalid input MUST return the Phase 0 `{code,message,details,requestId}` envelope with field-level details, and unknown fields MUST NOT be accepted.

#### Scenario: Invalid request

- GIVEN an empty PATCH, out-of-range title, body, page, or pageSize
- WHEN the request is submitted
- THEN HTTP 400 is returned with the exact error envelope and no mutation or audit

### Requirement: Atomic, concurrency-safe audits

Mutations MUST lock the announcement row, serialize transitions, and write safe transaction-bound audit metadata containing event type, actor, changed field names, and status transition only. Rollback MUST remove both mutation and audit. No-op publish/withdraw/archive MUST change neither timestamps nor audit cardinality.

#### Scenario: Concurrent publication

- GIVEN two concurrent publish requests for one DRAFT
- WHEN both complete
- THEN one transition and one publish audit exist, both responses are consistent, and no duplicate transition event is recorded

### Requirement: Generated OpenAPI proof

Generated OpenAPI MUST document every route, role, allowlisted schema, validation bound, status/response code, archive idempotency, and Phase 0 error response; the checked-in artifact MUST equal generated output.

#### Scenario: Contract parity

- GIVEN the generated document and committed artifact
- WHEN the OpenAPI proof runs
- THEN they are byte/schema equivalent and all administration assertions pass
