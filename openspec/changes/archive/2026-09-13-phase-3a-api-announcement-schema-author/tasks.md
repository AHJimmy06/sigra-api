# Tasks: Phase 3A API Announcement Schema and Author Foundations

## Delivery Chain

- Delivery strategy: auto-chain
- Chain strategy: feature-branch-chain
- Order: 3A-Schema → 3A-Evidence → 3A-Seeds
- Current work unit: 3A-Seeds — stable, non-destructive seed names

```text
3A0 PostgreSQL helper
        │
        ▼
3A-Schema (complete) → 3A-Evidence (complete) → 📍 3A-Seeds (current) → 3B
```

## Slice A: Schema, Migration, Mapping, and Registration

### Review Workload Forecast

| Field                        | Value                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| Estimated changed lines      | 376 additions + 3 deletions = 379 (current exact 3A-Schema slice)                          |
| 400-line budget risk         | Low                                                                                        |
| Chained PRs recommended      | Yes — first of three independent slices                                                    |
| Decision needed before apply | No — `auto-chain` resolved                                                                 |
| Focused test command         | `npm test -- --runInBand --runTestsByPath src/config/typeorm-metadata.spec.ts`             |
| Runtime harness              | `npm run test:e2e -- --runInBand --runTestsByPath test/announcement-migration.e2e-spec.ts` |
| Rollback boundary            | Revert only 3A-Schema files and run 9000 down; only 3A-owned schema objects are removed    |

### Phase 1: Behavior-First RED Tests

- [x] 1.1 Extend `src/config/typeorm-metadata.spec.ts` with failing exact assertions for 9000 registration, additive entity mappings, migration-1000 ownership, constraints, indexes, and down order.
- [x] 1.3 Create `test/announcement-migration.e2e-spec.ts` with failing real-PostgreSQL scenarios for baseline capture, valid-author snapshot backfill, all-null authorless rows, checks/indexes, deletion retention, exact down equality, and repeatable up.

### Phase 2: Schema and Mapping GREEN Implementation

- [x] 2.1 Create `src/migrations/1724600009000-AddAnnouncementAuthorSchema.ts` with only display-name/snapshot columns, exact checks/indexes, safe backfills, and the specified down order; do not recreate migration-1000 objects.
- [x] 2.2 Update `src/users/user.entity.ts` and `src/announcements/announcement.entity.ts` with nullable display/snapshot fields and a nullable live `User` relation that does not claim FK ownership.
- [x] 2.3 Register 9000 exactly once in `src/config/typeorm.datasource.ts` after 8000, preserving the existing migration chain.
- [x] 2.4 Adapt only the hard-coded resident migration rollback count from four to five, preserving every resident scenario body/assertion and shared helper lifecycle.

### Phase 3: Verification and Handoff

- [x] 3.1 Run the Slice A focused metadata test and real PostgreSQL migration E2E; retain evidence for all listed migration scenarios.
- [x] 3.2 Run full unit and E2E regressions, global lint with baseline comparison, candidate-scoped lint/format checks, build, diff check, and the `<400` changed-line guard.
- [x] 3.3 Confirm `test/support/disposable-postgres.ts` is byte-identical to HEAD, the resident E2E change is only its rollback fixture count, and writers/projections remain 3B scope.

## 3A-Evidence: Correction Records

### Review Workload Forecast

| Field                        | Value                                                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Estimated changed lines      | 241 additions + 0 deletions = 241 (current exact 3A-Evidence slice: `design.md`, `tasks.md`, and `apply-progress.md`) |
| 400-line budget risk         | Low                                                                                                                   |
| Chained PRs recommended      | Yes — second of three independent slices                                                                              |
| Decision needed before apply | No — `auto-chain` resolved                                                                                            |
| Focused test command         | `npx prettier --check openspec/changes/phase-3a-api-announcement-schema-author/{design,tasks,apply-progress}.md`      |
| Runtime harness              | N/A — documentation/evidence has no runtime boundary; 3A-Schema retains the migration E2E evidence.                   |
| Rollback boundary            | Revert only `design.md`, `tasks.md`, and `apply-progress.md`; schema, seeds, and helper are unaffected.               |

### Phase 3: Evidence Correction

- [x] 3.5 Correct the three-slice forecast, dependency diagram, historical-token wording, resident-fixture design rationale, and exact rollback-proof evidence without changing requirements.

## 3A-Seeds: Stable, Non-Destructive Seed Names

### Review Workload Forecast

| Field                        | Value                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| Estimated changed lines      | 0 current changes; later independent implementation must remain below 400 additions + deletions         |
| 400-line budget risk         | Low                                                                                                     |
| Chained PRs recommended      | Yes — third of three independent slices                                                                 |
| Decision needed before apply | No — `auto-chain` resolved                                                                              |
| Focused test command         | `npm test -- --runInBand --runTestsByPath src/seed/seed.service.spec.ts`                                |
| Runtime harness              | N/A — SeedService has no independent runtime boundary; full regressions cover integration compatibility |
| Rollback boundary            | Revert only later changes to `src/seed/seed.service.ts` and `src/seed/seed.service.spec.ts`             |

### Phase 1: Behavior-First RED Tests

- [x] 1.2 Extend `src/seed/seed.service.spec.ts` with failing cases for stable ADMIN/GUARD names, trimmed/default resident name, null-only fill, invalid configuration before writes, and idempotent existing-user paths.

### Phase 2: Seed GREEN Implementation

- [x] 2.5 Update `src/seed/seed.service.ts` to preserve valid names, fill only nulls, validate trimmed configured values before writes, and keep existing-user behavior idempotent.

### Phase 3: Verification and Handoff

- [x] 3.4 Run the Slice B focused unit test, full regression, candidate-scoped lint/format checks, build, diff check, and the Slice B changed-line guard.
