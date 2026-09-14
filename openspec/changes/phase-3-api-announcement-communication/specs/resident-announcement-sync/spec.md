# Resident Announcement Sync Specification

## Purpose

Define a resident-only incremental feed that reconciles published announcements and withdrawals without push, outbox, scheduling, or UI behavior.

## Requirements

### Requirement: Resident-only change feed

The resident sync endpoint MUST require an authenticated RESIDENT and MUST return only announcements visible to that resident: published upserts and withdrawal/archive tombstones. ADMIN-only records, drafts, archived content bodies, and sensitive fields MUST NOT leak. Each response MUST include an opaque versioned cursor, `syncedAt`, bounded results, and the next cursor when more changes exist.

#### Scenario: Published upsert

- GIVEN a resident and a newly published announcement
- WHEN the resident requests the feed
- THEN one allowlisted upsert is returned with plain-text content, author projection, versioned cursor data, and `syncedAt`

#### Scenario: Withdrawal tombstone

- GIVEN a previously synchronized announcement that is withdrawn or archived
- WHEN the resident requests changes after its cursor
- THEN a tombstone identifies the announcement and action without returning its body

### Requirement: Cursor and monotonic change order

The cursor MUST be opaque, versioned, non-expiring during Phase 3, and bound to a persisted monotonic change order. Results MUST be strictly after the cursor in that order, with deterministic tie-breaking, and MUST use a bounded `limit` of 1–100 (default 100). Publication display ordering MUST remain separate from synchronization ordering; sync order MUST NOT be inferred from `publishedAt` or admin `updatedAt`.

#### Scenario: Stable incremental page

- GIVEN a valid cursor and changes committed before and during the request
- WHEN the resident requests the next page
- THEN each returned change has a greater change position, no change is skipped or duplicated, and the watermark is safe for the next request

#### Scenario: Invalid cursor

- GIVEN a malformed, unsupported-version, or otherwise invalid cursor
- WHEN the feed is requested
- THEN HTTP 400 uses code `CURSOR_INVALID` and the standard error envelope

### Requirement: Replay, idempotency, and concurrent transitions

Feed consumption MUST be safely replayable: repeating a request with the same cursor and limit MUST be idempotent for committed changes, and clients MAY deduplicate by announcement id plus change position. Row-locked lifecycle transitions MUST emit at most one change event per actual transition, while edits to published announcements MUST preserve publication state and produce a current upsert as required by the change contract.

#### Scenario: Concurrent publish and withdraw

- GIVEN concurrent lifecycle requests for one announcement
- WHEN the feed is read across resulting pages
- THEN changes have unique monotonic positions, transition order is deterministic, and no duplicate transition event exists

### Requirement: Synchronization contract validation

The feed MUST reject non-integer, below-1, above-100, or unknown limit values with HTTP 400 and field-level standard error details. Cursor absence MUST mean the beginning of the retained change stream; cursors MUST NOT expire in Phase 3. `syncedAt` MUST be an ISO UTC timestamp representing the server-observed synchronization watermark.

#### Scenario: Invalid limit and initial sync

- GIVEN an invalid limit or no cursor
- WHEN the resident requests the feed
- THEN invalid input returns the standard 400 envelope, while no cursor returns the first bounded page and a usable watermark

### Requirement: Generated OpenAPI sync proof

Generated OpenAPI MUST document the resident route, RESIDENT authorization, opaque versioned cursor, limit bounds, `syncedAt`, upsert/tombstone union, `CURSOR_INVALID`, and excluded sensitive fields. The committed artifact MUST match generated output.

#### Scenario: Consumer contract parity

- GIVEN generated OpenAPI and the committed artifact
- WHEN contract proof runs
- THEN they match and assertions cover cursor replay, tombstones, ordering, and response allowlists

## Out of Scope

Push, devices, outboxes, scheduling, rich text, attachments, Web UI, and Mobile UI are not requirements of this capability.
