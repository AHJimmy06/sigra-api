## Exploration: Phase 3A API announcement schema and author foundations

### Current State

The verified migration chain is `1724600000000` through `1724600008000`, registered in order by `src/config/typeorm.datasource.ts` with `synchronize: false`. Migration `0000` creates the core `announcements` and `users` tables. Migration `1000` already creates `pg_trgm` and `announcement_status`, adds `announcements.status announcement_status NOT NULL DEFAULT 'DRAFT'`, backfills status from `published_at`, adds nullable `author_user_id` with a PostgreSQL-generated foreign key to `users(id) ON DELETE SET NULL`, and creates `idx_announcements_search` plus `idx_announcements_published_created`. Migrations `2000`–`8000` do not replace those announcement objects; `5000` and `6000` normalize unit codes and user emails, while `7000` and `8000` add archive metadata.

The `Announcement` entity already maps `status` and `authorUserId`, but it has no TypeORM live `User` relation or immutable snapshot columns. `User` has no display name. `AnnouncementsService` joins the live user manually, uses email as both author name and email, and writes only `authorUserId`; those writer/projection corrections belong to 3B, not 3A.

The selected policy is **Completar snapshots existentes**. Existing announcements whose non-null `author_user_id` still references a user must receive immutable snapshot id/email and nullable display name from that user. Announcements that are genuinely unauthored already have null `author_user_id`; rows whose author was deleted are also null because migration 1000 owns an `ON DELETE SET NULL` foreign key. Those rows remain all-null across live and snapshot author fields. A valid migration-1000 database cannot contain a non-null orphaned author id.

Development seed configuration provides ADMIN/GUARD email and password keys only; it has no ADMIN/GUARD name keys. Resident seeding already supports `SEED_RESIDENT_NAME` with `Development Resident` as its default. Therefore 3A must use stable literals `Development Administrator` and `Development Guard` for those seeded profiles, and use the configured/default resident name for the resident user, without inventing environment variables.

### Affected Areas

- `src/migrations/1724600009000-AddAnnouncementAuthorSchema.ts` — add only 3A-owned profile/snapshot columns, checks, and indexes; backfill existing referenced authors; preserve all migration-1000 objects.
- `src/config/typeorm.datasource.ts` — register migration `9000` exactly once after `8000`.
- `src/users/user.entity.ts` — map nullable `displayName`.
- `src/announcements/announcement.entity.ts` — add snapshot mappings and the nullable live `User` relation while retaining the existing status and author-id mappings.
- `src/seed/seed.service.ts` — persist stable ADMIN/GUARD display names and the existing configured/default resident name.
- `src/seed/seed.service.spec.ts` — prove all three seed display-name policies without new environment keys.
- `src/config/typeorm-metadata.spec.ts` — retain focused migration registration and entity/catalog parity assertions.
- `test/support/disposable-postgres.ts` — exact extraction target for the small Docker PostgreSQL lifecycle currently duplicated inline in `test/resident-unit-administration.e2e-spec.ts` and implemented more extensively inside `src/config/typeorm-metadata.spec.ts`.
- `test/resident-unit-administration.e2e-spec.ts` — switch only its container start/readiness/port/cleanup calls to the extracted helper, preserving its scenarios.
- `test/announcement-migration.e2e-spec.ts` — use the shared helper for mandatory real-PostgreSQL migration `up/down/up` proof.

### Approaches

1. **Selected: additive migration with existing-author snapshot completion** — leave migration-1000 enum, status column/default/data, live author column/FK, extension, and indexes untouched; add only profile/snapshot schema and 3A indexes, then backfill snapshots through `users` for rows with a valid live author.
   - Pros: Matches the verified baseline, preserves ownership and rollback identity, implements the confirmed snapshot policy, and minimizes DDL risk.
   - Cons: Requires careful joined backfill ordering before snapshot checks are validated; nullable historical authors remain intentionally unattributed.
   - Effort: Medium

2. **Rejected: recreate or replace migration-1000 announcement objects** — drop/recreate the enum, status, author column/FK, extension, or existing indexes as part of 3A.
   - Pros: Could assign new explicit names to inherited objects.
   - Cons: Violates object ownership, increases lock and rollback risk, can lose status/live-author data, and cannot restore the exact pre-3A catalog cheaply.
   - Effort: High and out of scope

### Recommendation

Implement only approach 1. Freeze the 3A persistence contract as follows:

- Add `users.display_name varchar(120) NULL` with `ck_users_display_name_valid`: null, or already trimmed with length 1–120. Backfill safe resident-linked values from `btrim(residents.name)`. Seeds explicitly write `Development Administrator`, `Development Guard`, and the existing configured/default resident name.
- Add nullable `author_id_snapshot uuid`, `author_display_name_snapshot varchar(120)`, and `author_email_snapshot varchar` to `announcements`. Do not add or recreate `announcement_status`, `status`, `author_user_id`, its migration-1000 FK, `pg_trgm`, `idx_announcements_search`, or `idx_announcements_published_created`.
- Complete existing snapshots with one joined update for rows where `author_user_id = users.id`: snapshot id from `users.id`, email from normalized `users.email`, and display name from nullable `users.display_name`. Leave genuinely unauthored/deleted-author rows all-null. Add `ck_announcements_author_snapshot` (all snapshots null, or id/email non-null) and `ck_announcements_live_author_matches_snapshot` (live author null or equal to snapshot id). Add `ck_announcements_published_at` without re-backfilling or recreating status.
- Add only `idx_announcements_admin_status_updated_id(status, updated_at DESC, id DESC)` and `idx_announcements_author_user_id(author_user_id)` as 3A-owned indexes.
- `down` must drop only 3A-owned indexes/checks/snapshot columns and `users.display_name`; it must not touch migration-1000’s enum, status/default/data, `author_user_id`, generated FK, extension, or announcement search/publication indexes. With no intervening application writes, schema, announcement data, and live author relation must compare exactly to the pre-3A migration-1000-through-8000 baseline.
- Real PostgreSQL proof is mandatory: migrate `0000`–`8000`, insert one announcement with a valid author and one all-null unauthored row, capture catalog/data/FK baselines, apply `9000`, verify the completed and all-null snapshot cases plus checks/indexes/deletion retention, run `down`, compare exact pre-3A catalog/data/live relation, then apply `9000` again and compare the resulting 3A catalog. SQL-capture mocks and metadata-only assertions are supplementary, not substitutes.
- Keep test infrastructure under the 400 changed-line cap by extracting only the generic ~35-line lifecycle surface from `test/resident-unit-administration.e2e-spec.ts` into `test/support/disposable-postgres.ts`: `startDisposablePostgres(prefix)` returns connection options plus an idempotent `stop()`, and internally owns Docker run, authenticated readiness polling, dynamic loopback port discovery, and forced cleanup. Retrofit the resident E2E with imports and call-site replacements, then import the same helper in the new announcement migration E2E. Do not copy or refactor the 1,550-line metadata proof, its schema-dump/catalog assertions, or application bootstrap. Target budget: at most 120 changed lines for helper extraction plus retrofit, 130 for the new PostgreSQL proof, and 150 for migration/entity/datasource/seed/focused assertions; if the measured diff exceeds 400, reduce duplicated assertions rather than broaden the harness extraction.
- Preserve the boundary exactly: 3A supplies schema, entity mappings, seed profile values, migration registration, and migration proof only. It does not change announcement service/controller/DTO behavior, lifecycle, audit behavior, feed tables, clocks, cursors, or events. 3B must transactionally copy creator id, nullable display name, and email into snapshots on insert, never mutate snapshots afterward, and explicitly project `authorId` from snapshot id plus nullable `{id,name,email}` author data without spreading entities or substituting live values.

### Risks

- Existing downstream child artifacts still encode the superseded “all legacy snapshots null” assumption; later phases must consume this corrected exploration and the confirmed **Completar snapshots existentes** decision without reopening it.
- Any attempt to rename or recreate migration-1000’s generated FK prevents exact pre-3A catalog restoration and expands lock scope unnecessarily.
- Exact rollback data equality is valid only without 3A-era writer activity; deployment rollback must remove 3B+ behavior before running 3A down.
- The 400-line cap remains tight; extracting more than the lifecycle surface or duplicating metadata-harness catalog utilities would exceed the budget.

### Ready for Proposal

Yes. The baseline, confirmed backfill policy, additive ownership boundary, exact rollback target, stable seed names, real-PostgreSQL `up/down/up` proof, low-churn harness extraction, and 3B writer handoff are now explicit. The orchestrator should proceed using **Completar snapshots existentes** as settled input and must not ask for that decision again.
