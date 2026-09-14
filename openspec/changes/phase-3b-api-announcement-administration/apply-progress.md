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

## TDD Cycle Evidence

| Task   | RED         | GREEN             | Triangulation / refactor                        |
| ------ | ----------- | ----------------- | ----------------------------------------------- |
| 3B.1.1 | 3B.1 RED    | 3B.1 GREEN        | mapper snapshot/legacy; allowlisted mapper      |
| 3B.1.2 | 3B.1 RED    | 3B.1 GREEN        | controller/service reads; delegation retained   |
| 3B.1.3 | N/A harness | 3B.4 proof        | cleanup/locks; cleanup retained                 |
| 3B.2.1 | 3B.2 RED    | 3B.2 GREEN        | pipe shapes; discriminated command retained     |
| 3B.2.2 | 3B.2 RED    | 3B.2 GREEN        | create/content cases; transaction flow retained |
| 3B.3.1 | 3B.3 RED    | 3B.3 GREEN        | no-op/terminal cases; lock authority retained   |
| 3B.3.2 | 3B.3 RED    | 3B.3 GREEN        | archive/409 cases; integration retained         |
| 3B.4.1 | N/A proof   | 3B.4 proof        | core HTTP proof                                 |
| 3B.4.2 | N/A proof   | 3B.4 proof        | concurrency/rollback/cleanup proof              |
| 3B.4.3 | N/A scope   | structural checks | 19-path scope; no runtime refactor              |

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
