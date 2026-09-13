# Design: Phase 3A API Announcement Schema and Author Foundations

## Technical Approach

Dependency is **3A0 → 3A-Schema → 3A-Evidence → 3A-Seeds → 3B**. Child `phase-3a0-api-postgres-test-harness` extracts/verifies the PostgreSQL helper. 3A-Schema consumes the helper unchanged, adapts only the resident migration rollback fixture from four registered migrations to five, and owns schema, mappings, registration, and focused proof. 3A-Evidence records the correction independently. 3A-Seeds remains deferred. 3B owns writers/projections.

## Architecture Decisions

| Decision                                | Alternative                                 | Choice and rationale                                                                                                          |
| --------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Preserve migration ownership            | Recreate 1000 objects                       | 9000 owns only additions, preserving rollback identity.                                                                       |
| Complete valid legacy authors           | Leave snapshots null                        | Backfill through the existing FK; null live authors remain all-null.                                                          |
| Scalar FK plus nullable `User` relation | Relation-owned FK                           | `createForeignKeyConstraints: false` preserves migration-1000 FK ownership.                                                   |
| Split infrastructure first              | Extract inside 3A                           | 3A0 absorbs churn and resident regression proof, keeping 3A below 400.                                                        |
| Minimal resident regression adaptation  | Leave a stale four-migration rollback count | Registration of 9000 makes the fixture reverse five migrations; retain every lifecycle and scenario-body assertion unchanged. |

## Migration and Data Flow

`up` adds nullable `users.display_name varchar(120)`, backfills valid trimmed resident names, adds snapshots in order `author_id_snapshot uuid`, `author_display_name_snapshot varchar(120)`, `author_email_snapshot varchar`, and copies valid live users. It adds/validates in order `ck_users_display_name_valid`, `ck_announcements_author_snapshot`, `ck_announcements_live_author_matches_snapshot`, `ck_announcements_published_at`, then creates `idx_announcements_admin_status_updated_id(status, updated_at DESC, id DESC)` and `idx_announcements_author_user_id(author_user_id)`. Predicates match the delta spec exactly.

`down` executes these separate statements in this exact order:

```sql
DROP INDEX "idx_announcements_author_user_id";
DROP INDEX "idx_announcements_admin_status_updated_id";
ALTER TABLE "announcements" DROP CONSTRAINT "ck_announcements_published_at";
ALTER TABLE "announcements" DROP CONSTRAINT "ck_announcements_live_author_matches_snapshot";
ALTER TABLE "announcements" DROP CONSTRAINT "ck_announcements_author_snapshot";
ALTER TABLE "users" DROP CONSTRAINT "ck_users_display_name_valid";
ALTER TABLE "announcements" DROP COLUMN "author_email_snapshot";
ALTER TABLE "announcements" DROP COLUMN "author_display_name_snapshot";
ALTER TABLE "announcements" DROP COLUMN "author_id_snapshot";
ALTER TABLE "users" DROP COLUMN "display_name";
```

Migration-1000 enum, status/default/data, `author_user_id`, FK, extension, and indexes remain untouched.

## Interfaces / Contracts

3A0 hands off `test/support/disposable-postgres.ts` exporting `startDisposablePostgres(prefix: string): Promise<{ options: { type:'postgres'; host:'127.0.0.1'; port:number; username:string; password:string; database:string }; stop(): Promise<void> }>`; it owns fixed-argv Docker start, authenticated 60×250 ms readiness, dynamic loopback port, failure cleanup, and idempotent forced stop. 3A-Schema edits neither helper nor resident scenario bodies; it changes only the resident fixture's registered-migration rollback count from four to five.

`User.displayName` is nullable. `Announcement` adds three nullable snapshots and nullable `author: User` through retained `author_user_id`. Seeds preserve names, fill null ADMIN/GUARD with literals, and use trimmed configured/default resident name. 3B transactionally snapshots creator id/name/email once and projects snapshots only; 3A changes no service/controller/DTO, lifecycle, audit, feed, clock, cursor, event, or OpenAPI behavior.

## Three-Slice Review Budget

| 3A-Schema file                                                | Action |   + |   − |
| ------------------------------------------------------------- | ------ | --: | --: |
| `src/migrations/1724600009000-AddAnnouncementAuthorSchema.ts` | Create |  73 |   0 |
| `src/config/typeorm.datasource.ts`                            | Modify |   2 |   0 |
| `src/users/user.entity.ts`                                    | Modify |   7 |   0 |
| `src/announcements/announcement.entity.ts`                    | Modify |  17 |   0 |
| `src/config/typeorm-metadata.spec.ts`                         | Modify |  57 |   2 |
| `test/announcement-migration.e2e-spec.ts`                     | Create | 217 |   0 |
| `test/resident-unit-administration.e2e-spec.ts`               | Modify |   3 |   1 |

**3A-Schema current measurement: 376 additions + 3 deletions = 379 changed lines.** Rollback reverts only these files and runs 9000 down; 3A-owned columns, checks, and indexes are removed without altering migration-1000 objects.

**3A-Evidence:** `design.md`, `tasks.md`, and `apply-progress.md` are a separate documentation/evidence commit. Its current exact measurement is recorded in `tasks.md` and `apply-progress.md`; its rollback reverts only those records.

**3A-Seeds:** `src/seed/seed.service.ts` and `src/seed/seed.service.spec.ts` remain byte-identical to HEAD at 0 changed lines. They are a later independent slice with its own focused tests and rollback boundary.

Run this unchanged from the repository root immediately pre-apply and pre-commit. `git diff HEAD` counts staged/unstaged tracked additions and deletions; each intended untracked file is measured against `/dev/null`:

```bash
paths=(src/migrations/1724600009000-AddAnnouncementAuthorSchema.ts src/config/typeorm.datasource.ts src/users/user.entity.ts src/announcements/announcement.entity.ts src/config/typeorm-metadata.spec.ts test/announcement-migration.e2e-spec.ts test/resident-unit-administration.e2e-spec.ts)
new_paths=(src/migrations/1724600009000-AddAnnouncementAuthorSchema.ts test/announcement-migration.e2e-spec.ts)
tracked=$(git diff HEAD --numstat -- "${paths[@]}" | awk '$1~/^[0-9]+$/&&$2~/^[0-9]+$/{n+=$1+$2}END{print n+0}')
untracked=0; for p in "${new_paths[@]}"; do if ! git ls-files --error-unmatch -- "$p" >/dev/null 2>&1 && [ -f "$p" ]; then s=$(git diff --no-index --numstat -- /dev/null "$p"); r=$?; [ "$r" -le 1 ] || exit "$r"; n=$(printf '%s\n' "$s" | awk '$1~/^[0-9]+$/&&$2~/^[0-9]+$/{n+=$1+$2}END{print n+0}'); untracked=$((untracked+n)); fi; done
total=$((tracked+untracked)); printf '%s\n' "$total"; [ "$total" -lt 400 ] || { printf 'Phase 3A hard stop: %s changed lines\n' "$total" >&2; exit 1; }
```

## Testing Strategy

Unit/metadata tests prove exact query order, mappings, registration, and migration ownership. The new E2E uses the 3A0 helper for real PostgreSQL 0000–8000 baseline → 9000 up/down/up, non-null resident-derived display-name snapshots for valid authors, all-null genuinely authorless rows, checks, indexes, isolated deletion retention, and exact relevant catalog/data restoration. The baseline comparison covers affected columns with types/nullability/defaults, constraints including FKs, indexes, `announcement_status`/`pg_trgm` ownership, and announcement data/status/author-reference state; it does not claim objects outside 9000's effect. Run `npm test -- --runInBand --runTestsByPath src/config/typeorm-metadata.spec.ts`; `npm run test:e2e -- --runInBand --runTestsByPath test/announcement-migration.e2e-spec.ts`; `npm run lint`; and `npm run build`.

## Threat Matrix

The subprocess boundary is owned and RED-tested by 3A0; 3A only calls its verified typed API.

| Boundary                 | Applicability / reason                                            |
| ------------------------ | ----------------------------------------------------------------- |
| Documentation-like paths | N/A — no executable classification.                               |
| Git repository selection | N/A — no repository selection automation.                         |
| Commit state             | N/A — the documented gate measures state but automates no commit. |
| Push state               | N/A — no push behavior.                                           |
| PR commands              | N/A — no PR automation.                                           |

## Migration / Rollout

Accept 3A0 first, deploy 9000 before 3B, and roll back 3B before exact 9000 down. No feature flag is required.

## Open Questions

None.
