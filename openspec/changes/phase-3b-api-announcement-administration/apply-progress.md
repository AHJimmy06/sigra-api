# Apply Progress: Phase 3B API Announcement Administration

## Status

Complete — 10/10 tasks are checked. One maintainer-approved `size:exception` PR
under `exception-ok`; next: `sdd-verify`. This correction changes no runtime code
or history.

## Canonical Final-Ancestry Ledger

All historical identifiers below are full SHA-1 values. Canonical artifact GREEN:
`ed13aed57e027422d86755df08bc0ec04caf0c7d`. Its artifact-only correction
successor is identified by Git externally after commit, not self-referenced here.

- **3B.1** — parent `9afc8ffda2224de7f7b514908622769fa789b647`; RED
  `224f0f3bec3164ece4b881965ac310e42add1a16`; GREEN
  `b4402ed203bd3eb921365cce612d49a4bc4590ec`; 702 lines. Rollback:
  `src/announcements/announcement.dto.ts`, `announcement.mapper.spec.ts`,
  `announcement.mapper.ts`, `announcements.controller.spec.ts`,
  `announcements.controller.ts`, `announcements.service.spec.ts`,
  `announcements.service.ts`, and
  `test/support/announcement-administration-http-harness.ts`.
- **3B.2** — parent `b4402ed203bd3eb921365cce612d49a4bc4590ec`; RED
  `041eddaa65b7fbab65461eb392f2943704838d56`; GREEN
  `52557e192657562df35a22202a6ab9b877e6f8ed`; 387 lines. Rollback:
  `src/announcements/announcement-patch.pipe.spec.ts`,
  `announcement-patch.pipe.ts`, `announcements.controller.ts`,
  `announcements.service.spec.ts`, and `announcements.service.ts`.
- **3B.3** — parent `52557e192657562df35a22202a6ab9b877e6f8ed`; RED
  `116ebee9cf744cf7cb8c32acabbd308a9a80df00`; GREEN
  `a9189e79036ce9e052d9d9aaf862a75b72c28f22`; 155 lines. Rollback:
  `src/announcements/announcements.controller.ts`,
  `announcements.service.spec.ts`, `announcements.service.ts`, and
  `src/common/http/http-error.contract.ts`.
- **3B.4** — parent `a9189e79036ce9e052d9d9aaf862a75b72c28f22`; proof
  `b5ef048b9a5b951b3109ab787edff2e76f73660a`; artifact GREEN
  `ed13aed57e027422d86755df08bc0ec04caf0c7d`; 1,080 lines. Rollback:
  `test/announcement-administration-core.e2e-spec.ts`,
  `test/announcement-lifecycle.e2e-spec.ts`, and the six Phase 3B OpenSpec
  artifacts: `apply-progress.md`, `design.md`, `exploration.md`, `proposal.md`,
  `specs/announcement-administration/spec.md`, and `tasks.md`.

Retained RED refs exactly target
`224f0f3bec3164ece4b881965ac310e42add1a16`,
`041eddaa65b7fbab65461eb392f2943704838d56`, and
`116ebee9cf744cf7cb8c32acabbd308a9a80df00`. `3b-4-red` is absent because
3B.4 is proof-only.

## Replay Receipts

- **3B.1 GREEN** — mapper 2 + controller 2 + service 3 = **7 tests**; observed
  command-output SHA-256:
  `b3e1b15238d5c6a470ce8739951f273e919aad1e5e307bb53402bb6554d5a968`.
- **3B.2 GREEN** — pipe 3 + service 5 = **8 tests**; observed command-output
  SHA-256: `ca836799a521813eb42fbaec2386e6c88eb552dce4996fe8944287c84bb64bb6`.
- **3B.3 GREEN** — 1 suite / 7 tests; observed command-output SHA-256:
  `0a2dace35bc715a738ef2eef5a64b2a223cd691bdd944b520abe6f1f05d65c2b`.
- **3B.4 proof** — 3 suites / 8 tests; observed command-output SHA-256:
  `acd236aa3a089f8d2b97a995fe26c1372dbe83a73f3450b2b395f97ef4683b74`.

## Task-Level Numeric Triangulation

Each completed task has a separate numeric observation. Counts are derived from
the named Git tree or source path; they are not inferred from task ranges.

| Task   | Observed numeric evidence                                            | Exact source evidence                                                                                                                                                                                                                                  | Result                                                                                                                |
| ------ | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| 3B.1.1 | 2 mapper test cases; 1 production DTO path; 0 claimed DTO spec paths | `b4402ed203bd3eb921365cce612d49a4bc4590ec:src/announcements/announcement.mapper.spec.ts` has 2 `it` blocks; `src/announcements/announcement.dto.ts` is the response contract; no `announcement.dto.spec.ts` is claimed                                 | PASS — 3B.1 GREEN contributes 2 of 7 focused tests.                                                                   |
| 3B.1.2 | 2 controller + 3 service = 5 focused test cases                      | `b4402ed203bd3eb921365cce612d49a4bc4590ec:src/announcements/announcements.controller.spec.ts` (2 `it` blocks) and `...:announcements.service.spec.ts` (3 `it` blocks)                                                                                  | PASS — with 3B.1.1, 7/7 3B.1 GREEN tests.                                                                             |
| 3B.1.3 | 1 reusable harness path; 2 downstream proof paths                    | `b4402ed203bd3eb921365cce612d49a4bc4590ec:test/support/announcement-administration-http-harness.ts`; `b5ef048b9a5b951b3109ab787edff2e76f73660a` adds `test/announcement-administration-core.e2e-spec.ts` and `test/announcement-lifecycle.e2e-spec.ts` | PASS — harness exercised by the 3-suite/8-test PostgreSQL receipt.                                                    |
| 3B.2.1 | 3 strict-pipe test cases                                             | `52557e192657562df35a22202a6ab9b877e6f8ed:src/announcements/announcement-patch.pipe.spec.ts` has 3 `it` blocks                                                                                                                                         | PASS — 3B.2 GREEN contributes 3 of 8 focused tests.                                                                   |
| 3B.2.2 | 5 focused service test cases; 3 transaction implementation paths     | `52557e192657562df35a22202a6ab9b877e6f8ed:src/announcements/announcements.service.spec.ts` has 5 `it` blocks; pair inventory names `announcements.controller.ts`, `announcements.service.spec.ts`, and `announcements.service.ts`                      | PASS — with 3B.2.1, 8/8 3B.2 GREEN tests.                                                                             |
| 3B.3.1 | 2 lifecycle RED test cases; 1 service-spec path                      | `git show --unified=0 116ebee9cf744cf7cb8c32acabbd308a9a80df00 -- src/announcements/announcements.service.spec.ts` adds 2 `it` blocks                                                                                                                  | PASS — RED is retained; 3B.3 GREEN receipt is 1 suite/7 tests.                                                        |
| 3B.3.2 | 4 implementation paths; 7 service tests in GREEN tree                | `a9189e79036ce9e052d9d9aaf862a75b72c28f22` inventory: `announcements.controller.ts`, `announcements.service.spec.ts`, `announcements.service.ts`, `src/common/http/http-error.contract.ts`; its service spec has 7 `it` blocks                         | PASS — locked lifecycle, archive, and safe 409 are covered by the 1-suite/7-test receipt.                             |
| 3B.4.1 | 4 PostgreSQL/Nest HTTP proof cases                                   | `b5ef048b9a5b951b3109ab787edff2e76f73660a:test/announcement-administration-core.e2e-spec.ts` has 4 `it` blocks                                                                                                                                         | PASS — contributes 4 proof cases to the 3-suite/8-test receipt.                                                       |
| 3B.4.2 | 3 PostgreSQL lifecycle/concurrency/rollback proof cases              | `b5ef048b9a5b951b3109ab787edff2e76f73660a:test/announcement-lifecycle.e2e-spec.ts` has 3 `it` blocks                                                                                                                                                   | PASS — contributes 3 proof cases; the remaining 1 case is the existing migration suite in the 3-suite/8-test receipt. |
| 3B.4.3 | 19 scoped paths; 6 original Phase 3B OpenSpec artifact paths         | `git diff --name-only 9afc8ffda2224de7f7b514908622769fa789b647 ed13aed57e027422d86755df08bc0ec04caf0c7d` reports 19; its Phase 3B OpenSpec subset = 6                                                                                                  | PASS — scope, quality-gate record, and reverse-order rollback are complete.                                           |

The retained focused receipts are: 3B.1 GREEN 7 tests, 3B.2 GREEN 8 tests,
3B.3 GREEN 1 suite/7 tests, and 3B.4 proof 3 suites/8 tests. The 3B.4 total
contains 4 core cases, 3 lifecycle cases, and 1 existing migration case.

## Work Unit Evidence

Focused results: 3B.1 exit 0 / 7 tests; 3B.2 exit 0 / 8 tests; 3B.3 exit 0 /
7 tests; 3B.4 exit 0 / 3 suites / 8 tests. Runtime evidence is the 3B.4
disposable PostgreSQL/Nest HTTP proof; each exact rollback inventory is above.

Archived-detail GET proof remains in
`test/announcement-administration-core.e2e-spec.ts`: an ADMIN retrieves an
archived resource and asserts the exact nine-key safe snapshot payload with ISO
dates.

## Structural Check Baseline

Historical scoped Prettier and `git diff --check` checks exited 0. Project lint
remains the established baseline failure: exit 1; 621 findings (587 errors,
34 warnings); scoped lint passed. The historical range has 19 scoped paths and
no Phase 3A schema/entity/migration, 3C, 3D, or 3E path.

## Evidence Revision Handling

The stale embedded evidence revision has been removed. The native runtime ledger
carries the evidence revision externally. This artifact records observed
command-output hashes only and intentionally does not self-hash or invent a
competing digest.
