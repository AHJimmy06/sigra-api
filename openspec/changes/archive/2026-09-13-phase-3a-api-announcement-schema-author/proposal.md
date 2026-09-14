# Proposal: Phase 3A API Announcement Schema and Author Foundations

## Intent

Add immutable author-snapshot storage and user display names without taking ownership of announcement schema already established by migration 1000. Preserve truthful historical attribution and an exact 0000–8000 rollback baseline.

## Scope

### In Scope

- Add nullable user display names and announcement snapshot columns/checks.
- Complete snapshots for valid existing authors; keep unauthored/deleted-author rows all-null.
- Add two indexes, entity mappings, seed values, migration registration, and real PostgreSQL `up/down/up` proof.

### Out of Scope

- Recreating or dropping migration-1000 enum, status, `author_user_id`, FK, `pg_trgm`, `idx_announcements_search`, or `idx_announcements_published_created`.
- Endpoint, writer, projection, lifecycle, audit, feed, OpenAPI, Web/Mobile, or push behavior.

## Capabilities

### New Capabilities

- `announcement-administration`: Reversible author snapshot and display-name persistence foundations.

### Modified Capabilities

None.

## Approach

- Migration 9000 adds `users.display_name`, three snapshot columns, display/snapshot/live-match/published-time checks, and only `idx_announcements_admin_status_updated_id` plus `idx_announcements_author_user_id`.
- Backfill safe resident display names and snapshot id/display-name/email from currently referenced users. Freeze ADMIN/GUARD seeds as `Development Administrator` / `Development Guard`; reuse the configured/default resident name with no new environment keys.
- Register 9000 once after 8000 and map the new fields plus nullable live `User` relation.
- Extract only a minimal disposable-PostgreSQL lifecycle helper and prove baseline, backfill, constraints, deletion retention, exact down restoration, and repeatable up.
- Hand off to 3B: writers transactionally copy creator values once; projections remain snapshot-based and immutable, never live-user substitutions.

## Affected Areas

| Area                                                                   | Impact       | Description                    |
| ---------------------------------------------------------------------- | ------------ | ------------------------------ |
| `src/users/user.entity.ts`, `src/announcements/announcement.entity.ts` | Modified     | Additive mappings              |
| `src/migrations/1724600009000-AddAnnouncementAuthorSchema.ts`          | New          | Schema and reversal            |
| `src/config/typeorm.datasource.ts`, `src/seed/`                        | Modified     | Registration and stable names  |
| `test/support/disposable-postgres.ts`, migration/seed/metadata tests   | New/Modified | Focused proof and helper reuse |

## Risks

| Risk                          | Likelihood | Mitigation                                                       |
| ----------------------------- | ---------- | ---------------------------------------------------------------- |
| Incorrect historical identity | Medium     | Snapshot only valid current references; preserve all-null rows   |
| Baseline damage on rollback   | Medium     | Drop only 3A-owned objects and compare catalogs/data             |
| Review budget overrun         | Medium     | Keep helper extraction minimal and total changed lines below 400 |

## Rollback Plan

Remove only 3A-owned indexes, checks, snapshot columns, and `display_name`. Restore the exact 0000–8000 schema/data baseline; never drop or replace migration-1000 objects. Roll back 3B+ writers before running down.

## Dependencies

- PostgreSQL, TypeORM, Docker, and the existing 0000–8000 migration chain.

## Success Criteria

- [ ] Migration 1000 objects remain unchanged through 3A up/down.
- [ ] Valid authored rows receive snapshots; unauthored/deleted-author rows remain all-null.
- [ ] Entity, seed, registration, and real PostgreSQL `up/down/up` proof pass.
- [ ] Full authored changed-line workload remains below 400.
