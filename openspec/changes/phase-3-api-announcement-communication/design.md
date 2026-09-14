# Design: Phase 3 API Announcement Communication

## Technical Approach

Keep accepted Phase 3A and 3B immutable. Phase 3A owns only author snapshots/display names through `1724600009000-AddAnnouncementAuthorSchema.ts`; Phase 3B owns the verified ADMIN lifecycle. Phase 3C first adds event/clock persistence, mappings, registration, and PostgreSQL proof, then augments Phase 3B transactions with event writes. Phases 3D–3G retain their cursor, route, OpenAPI, and handoff contracts.

## Architecture Decisions

| Decision         | Alternative                 | Choice and rationale                                                                                                              |
| ---------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Schema ownership | Amend archived 9000         | Add `src/migrations/1724600010000-AddAnnouncementChangeFeed.ts`; archives remain audit records.                                   |
| Position type    | PostgreSQL `bigint`         | Use `numeric(20,0)` plus `0..18446744073709551615` checks and TypeORM string fields, preserving exact decimal uint64 wire values. |
| Ordering         | Timestamp/sequence          | Lock singleton clock `id=1`, increment, and insert in the mutation transaction; this serializes event-producing commits.          |
| Delivery         | Chain or hard 400-line gate | One PR, `exception-ok`, maintainer-approved `size:exception`, no chain. Measure/document each phase without blocking.             |

## Persistence and Data Flow

Create `announcement_change_clock(id smallint PRIMARY KEY, value numeric(20,0) NOT NULL)` with singleton-id and uint64 checks, and `announcement_changes(position numeric(20,0) PRIMARY KEY, announcement_id uuid NOT NULL, kind varchar NOT NULL, action varchar NOT NULL, title text, body text, published_at timestamptz, author_display_name varchar(120), occurred_at timestamptz NOT NULL)`. Add FK `announcement_id → announcements.id ON DELETE RESTRICT`, kind/action compatibility and UPSERT-payload/TOMBSTONE-body-free checks, plus `idx_announcement_changes_announcement_position(announcement_id, position DESC)`.

Migration `up` creates clock then changes, inserts `(1,0)`, and backfills one `UPSERT/PUBLISHED` per existing PUBLISHED announcement. Assign `row_number()` positions ordered by `published_at, created_at, id`; copy title/body/published timestamp/snapshot name and use `published_at` as `occurred_at`. Finally set clock value from `COALESCE(MAX(position),0)`. Create `src/announcements/announcement-change.entity.ts` and `announcement-change-clock.entity.ts`; register 10000 after 9000 in `src/config/typeorm.datasource.ts` and both entities in `src/announcements/announcements.module.ts`.

    writer → lock announcement → mutate → audit → lock clock(1) → increment/event → commit
    reader → REPEATABLE READ manager → fixed H → clock_timestamp() → page (a,H]

`down` drops the event index, changes table, then clock table. It preserves announcements, Phase 3A columns, and Phase 3B data, but intentionally removes Phase 3C event history; therefore remove 3G→3D consumers and 3C writers first. Never run down while issued cursors remain supported.

## Preserved Contracts

Phase 3B ADMIN routes, strict PATCH classification, first `publishedAt`, locks, audits, no-ops, terminal 200 archive, projections, validation, and ordering remain unchanged. Phase 3C emits events only for immediate publication, published edits, publish, withdrawal, and archive-from-published; no-op/DRAFT-only changes emit none, and mutation/audit/clock/event roll back together.

Phase 3D keeps canonical base64url `{v:1,a:"<uint64>",h:"<uint64>"}` cursors and one-manager REPEATABLE READ. No cursor means `a=0,H=clock`; `a<h` retains `H=h`; `a=h` rolls to the current clock. Reject malformed/noncanonical/oversized/unsupported/future cursors and `a>h`. Read one `clock_timestamp()`, then `limit+1` rows in `(a,H]`. While more exist, `nextCursor={a:lastPosition,h:H}`; always return `checkpoint={a:H,h:H}`, which consumers use only after `hasMore=false`.

Phase 3E keeps RESIDENT-only `GET /api/resident/announcements`, limit 1–100/default 100, `CURSOR_INVALID`, and `{items,checkpoint,hasMore,nextCursor?,syncedAt}`. UPSERT remains `{position,announcementId,kind:"UPSERT",action:"PUBLISHED"|"UPDATED",title,body,publishedAt,author:{name},occurredAt}`; TOMBSTONE remains `{position,announcementId,kind:"TOMBSTONE",action:"WITHDRAWN"|"ARCHIVED",occurredAt}`. Positions are decimal strings and timestamps ISO UTC. Phase 3F/3G keep separate ADMIN/RESIDENT generation, byte parity, and final API/artifact SHA handoff.

## Phase 3C RED → GREEN Proof

Phase 3C is reconstructed as one final conventional commit after all RED → GREEN
cycles execute in the working tree. RED and GREEN are command/output receipts,
not immutable Git refs or adjacent commits. This preserves test-first evidence
without fragmenting the reviewable Phase 3C work unit.

1. Schema RED: add exact SQL/entity/registration assertions in `src/migrations/1724600010000-AddAnnouncementChangeFeed.spec.ts`, `src/config/typeorm-metadata.spec.ts`, and real PostgreSQL `test/announcement-change-feed-migration.e2e-spec.ts`; run both commands below and retain their expected failures.
2. Schema GREEN: implement migration/entities/registrations; rerun both commands to prove up, deterministic backfill, checks/FK/indexes, metadata parity, down announcement preservation, and up/down/up:
   `npm test -- --runInBand --runTestsByPath src/migrations/1724600010000-AddAnnouncementChangeFeed.spec.ts src/config/typeorm-metadata.spec.ts`
   `npm run test:e2e -- --runInBand --runTestsByPath test/announcement-change-feed-migration.e2e-spec.ts`
3. Writer RED then GREEN: `npm test -- --runInBand --runTestsByPath src/announcements/announcement-lifecycle.service.spec.ts`; then `npm run test:e2e -- --runInBand --runTestsByPath test/announcement-lifecycle.e2e-spec.ts`.

For every 3C–3G staged phase, record nonblocking output from `git diff --cached --numstat` and `git diff --cached --numstat | awk '$1~/^[0-9]+$/&&$2~/^[0-9]+$/{n+=$1+$2}END{print n+0}'`; the approved exception replaces the obsolete `<400` failure gate.

## Requirement / Scenario Coverage

Ownership changes only: **Reversible announcement persistence / Migration parity and rollback** move from 3A to **3A+3C**; **Cursor and monotonic change order** moves from 3A+3C+3D+3G to **3C+3D+3G**. All other requirement/scenario phase mappings remain unchanged.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary is implemented; documented commands are maintainer-run proof.

## Migration / Rollout

Deploy 10000 before 3C writers, then 3D–3G. Roll back in reverse order and accept cursor/event-history invalidation before 10000 down. No feature flag. Open questions: none.
