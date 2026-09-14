# Tasks: Phase 3B API Announcement Administration

## Review Workload Forecast

- Original forecast: 1,050–1,400 changed lines.
- Final observed size: 2,042 changed lines (1,897 additions + 145 deletions) in
  `git diff --numstat 9afc8ff..HEAD`.
- Historical pair totals: 3B.1 702; 3B.2 387; 3B.3 155; 3B.4 1,080. They are
  adjacent work-unit sizes, not the final-range total.
- Delivery: one PR; maintainer-approved `size:exception`; `exception-ok`.
- Chained PRs: no.

The original forecast is planning history. The final observed size is the
authoritative result.

## Completed Tasks

- [x] 3B.1.1 Add mapper RED cases and the allowlisted mapper/DTO response contract.
- [x] 3B.1.2 Add controller/service RED cases and ADMIN read/list/detail behavior.
- [x] 3B.1.3 Add the reusable PostgreSQL HTTP harness.
- [x] 3B.2.1 Add strict PATCH classifier RED cases and implementation.
- [x] 3B.2.2 Add create/content RED cases and transactional implementation.
- [x] 3B.3.1 Add lifecycle RED cases.
- [x] 3B.3.2 Implement locked lifecycle, archive route, and safe 409 registration.
- [x] 3B.4.1 Add core administration PostgreSQL proof.
- [x] 3B.4.2 Add lifecycle/concurrency PostgreSQL proof.
- [x] 3B.4.3 Record scope/quality gate results and reverse-order rollback plan.

## Exact Rollback Inventories

- **3B.1:** `src/announcements/announcement.dto.ts`,
  `src/announcements/announcement.mapper.spec.ts`,
  `src/announcements/announcement.mapper.ts`,
  `src/announcements/announcements.controller.spec.ts`,
  `src/announcements/announcements.controller.ts`,
  `src/announcements/announcements.service.spec.ts`,
  `src/announcements/announcements.service.ts`, and
  `test/support/announcement-administration-http-harness.ts`.
- **3B.2:** `src/announcements/announcement-patch.pipe.spec.ts`,
  `src/announcements/announcement-patch.pipe.ts`,
  `src/announcements/announcements.controller.ts`,
  `src/announcements/announcements.service.spec.ts`, and
  `src/announcements/announcements.service.ts`.
- **3B.3:** `src/announcements/announcements.controller.ts`,
  `src/announcements/announcements.service.spec.ts`,
  `src/announcements/announcements.service.ts`, and
  `src/common/http/http-error.contract.ts`.
- **3B.4:** `test/announcement-administration-core.e2e-spec.ts`,
  `test/announcement-lifecycle.e2e-spec.ts`,
  `openspec/changes/phase-3b-api-announcement-administration/apply-progress.md`,
  `design.md`, `exploration.md`, `proposal.md`,
  `specs/announcement-administration/spec.md`, and `tasks.md`.

Keep tests with their behavior. Do not alter the unrelated Phase 3 umbrella.
