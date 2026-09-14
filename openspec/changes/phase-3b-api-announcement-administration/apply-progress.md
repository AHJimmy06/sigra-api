# Apply Progress: Phase 3B API Announcement Administration

## Status

Complete — 10/10 tasks are checked. This is one maintainer-approved `size:exception` PR under `exception-ok`, with flexible adjacent RED/GREEN work-unit pairs. `next_recommended: sdd-verify`.

## Canonical Final-Ancestry Ledger

All IDs and receipts below are from the final ancestry rooted at `9afc8ffda2224de7f7b514908622769fa789b647`. There are no competing parent IDs, hashes, subjects, or self-references.

| Unit | Parent                                     | RED                                        | GREEN                         | Ownership                                                     | Rollback pair and file scope                                                                                                  |
| ---- | ------------------------------------------ | ------------------------------------------ | ----------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 3B.1 | `9afc8ffda2224de7f7b514908622769fa789b647` | `224f0f3bec3164ece4b881965ac310e42add1a16` | `b4402ed`                     | Tasks 1.1–1.3: read/projection and reusable harness           | Revert `b4402ed` then `224f0f3`: mapper, DTO/read controller/service, their unit tests, and reusable HTTP/PostgreSQL harness. |
| 3B.2 | `b4402ed`                                  | `041eddaa65b7fbab65461eb392f2943704838d56` | `52557e1`                     | Tasks 2.1–2.2: PATCH classifier, create, and content mutation | Revert `52557e1` then `041edda`: patch pipe/test and create/content controller/service/spec behavior.                         |
| 3B.3 | `52557e1`                                  | `116ebee9cf744cf7cb8c32acabbd308a9a80df00` | `a9189e7`                     | Tasks 3.1–3.2: lifecycle, locks, archive, and audits          | Revert `a9189e7` then `116ebee`: lifecycle controller/service/spec behavior and safe 409 registration.                        |
| 3B.4 | `a9189e7`                                  | N/A production RED                         | `b5ef048` then artifact GREEN | Tasks 4.1–4.3: system proof and OpenSpec receipt              | Revert `b5ef048` and final artifact GREEN: both E2E suites and six Phase 3B OpenSpec artifacts.                               |

Retained RED refs exactly match the final RED commits/trees: `refs/gentle-ai/tdd/phase-3b/3b-1-red` → `224f0f3bec3164ece4b881965ac310e42add1a16`; `3b-2-red` → `041eddaa65b7fbab65461eb392f2943704838d56`; `3b-3-red` → `116ebee9cf744cf7cb8c32acabbd308a9a80df00`. Obsolete `3b-4-red` was removed because 3B.4 is proof-only.

## Replay Receipts

| Unit       | Copy-pastable command                                                                                                                                                      | Result | Bounded relevant output                                                          | SHA-256                                                            |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 3B.1 RED   | `npm test -- --runInBand src/announcements/announcement.mapper.spec.ts src/announcements/announcements.controller.spec.ts src/announcements/announcements.service.spec.ts` | exit 1 | `controller.findOne is not a function`; `service.findOne is not a function`      | `8f36f72221f3106050dc6f90db052bc065afcd366eee740c35d4ca54b59191c5` |
| 3B.1 GREEN | `npm test -- --runInBand src/announcements/announcement.mapper.spec.ts src/announcements/announcements.controller.spec.ts src/announcements/announcements.service.spec.ts` | exit 0 | 3 suites / 9 tests passed                                                        | `b3e1b15238d5c6a470ce8739951f273e919aad1e5e307bb53402bb6554d5a968` |
| 3B.2 RED   | `npm test -- --runInBand src/announcements/announcement-patch.pipe.spec.ts src/announcements/announcements.service.spec.ts`                                                | exit 1 | snapshot response lacks `authorId`; content returns a Date instead of ISO        | `70432c5a56ba3f23548f3b2d60a68da039505ebcefa16bbcb7d0834cacfbdab9` |
| 3B.2 GREEN | `npm test -- --runInBand src/announcements/announcement-patch.pipe.spec.ts src/announcements/announcements.service.spec.ts`                                                | exit 0 | 2 suites / 13 tests passed                                                       | `ca836799a521813eb42fbaec2386e6c88eb552dce4996fe8944287c84bb64bb6` |
| 3B.3 RED   | `npm test -- --runInBand src/announcements/announcements.service.spec.ts`                                                                                                  | exit 1 | `Publication transitions are not available`; `service.archive is not a function` | `3bd6e6dc23079da477f06a22cac4c08915fa6bd5d823e07813d6c59cacadd07c` |
| 3B.3 GREEN | `npm test -- --runInBand src/announcements/announcements.service.spec.ts`                                                                                                  | exit 0 | 1 suite / 7 tests passed                                                         | `0a2dace35bc715a738ef2eef5a64b2a223cd691bdd944b520abe6f1f05d65c2b` |
| 3B.4 proof | `npm run test:e2e -- --runInBand test/announcement-migration.e2e-spec.ts test/announcement-administration-core.e2e-spec.ts test/announcement-lifecycle.e2e-spec.ts`        | exit 0 | 3 suites / 8 tests passed                                                        | `acd236aa3a089f8d2b97a995fe26c1372dbe83a73f3450b2b395f97ef4683b74` |

## TDD Cycle Evidence

| Tasks   | RED                                      | GREEN                                      | Triangulation                                       | Refactor                                                |
| ------- | ---------------------------------------- | ------------------------------------------ | --------------------------------------------------- | ------------------------------------------------------- |
| 1.1–1.3 | ✅ Written: 3B.1 RED receipt             | ✅ Passed: 3B.1 GREEN receipt              | 3 mapper cases; 3 controller/service cases          | ✅ Pure allowlisted mapper and harness cleanup retained |
| 2.1–2.2 | ✅ Written: 3B.2 RED receipt             | ✅ Passed: 3B.2 GREEN receipt              | 5 pipe shapes; 8 create/content cases               | ✅ Discriminated command retained                       |
| 3.1–3.2 | ✅ Written: 3B.3 RED receipt             | ✅ Passed: 3B.3 GREEN receipt              | 2 lifecycle/lock paths plus terminal archive repeat | ✅ Single locked mutation authority retained            |
| 4.1–4.3 | N/A production RED: proof-only work unit | ✅ Passed: bounded PostgreSQL system proof | 8 HTTP/concurrency/rollback cases                   | ✅ Proof-only; no production refactor                   |

## Work Unit Evidence

| Unit | Focused test command/result                         | Runtime harness command/result                                   | Rollback boundary                                                        |
| ---- | --------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 3B.1 | 3B.1 GREEN command, exit 0, 3 suites / 9 tests      | 3B.4 PostgreSQL proof, exit 0, 3 suites / 8 tests                | 3B.1 pair only: read/projection/harness scope in canonical ledger.       |
| 3B.2 | 3B.2 GREEN command, exit 0, 2 suites / 13 tests     | 3B.4 PostgreSQL proof, exit 0, create/content scenarios          | 3B.2 pair only: classifier and create/content scope in canonical ledger. |
| 3B.3 | 3B.3 GREEN command, exit 0, 1 suite / 7 tests       | 3B.4 PostgreSQL proof, exit 0, lifecycle/lock/rollback scenarios | 3B.3 pair only: lifecycle and safe-409 scope in canonical ledger.        |
| 3B.4 | three-suite E2E command, exit 0, 3 suites / 8 tests | same real disposable PostgreSQL/Nest HTTP command, exit 0        | proof commit plus artifact GREEN only.                                   |

Archived-detail GET proof is retained in `test/announcement-administration-core.e2e-spec.ts`: ADMIN retrieves an archived resource and asserts the exact nine-key safe snapshot payload with ISO dates.

## Final Checks

Post-refactor commands ran after the final artifact content was written.

| Copy-pastable command                                                                                                                                                                                                                                | Exit / bounded result                                                | SHA-256                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `npm test -- --runInBand`                                                                                                                                                                                                                            | 0; 34 suites / 178 tests passed                                      | `ef8ae800bcd07137379c0682aa6b30f4699cab4e7783942156254021929b1dd6` |
| `npm run test:e2e -- --runInBand test/announcement-migration.e2e-spec.ts test/announcement-administration-core.e2e-spec.ts test/announcement-lifecycle.e2e-spec.ts`                                                                                  | 0; 3 suites / 8 tests passed                                         | `d8b31c8212430beeea360d0e9ff8cddb295103ff13a1fa97a9544c2e7f44bc25` |
| `npm run test:e2e -- --runInBand test/announcement-administration-core.e2e-spec.ts test/announcement-lifecycle.e2e-spec.ts --testNamePattern='ADMIN authorization matrix\|malformed requests\|serializes PostgreSQL\|rolls back every announcement'` | 0; auth, validation, concurrency, and rollback: 4 passed / 3 skipped | `294bbb89893c79faa31438c6f9f812c652a93115bb5cb034c0d6c1c683dd3c41` |
| `npm run test:cov -- --runInBand`                                                                                                                                                                                                                    | 0; 34 suites / 178 tests; announcement lines 87.79%                  | `1b14e7062de2d7cf3366f5c6db35f6568d369e7877bfb1e493fc2bf153ddbf79` |
| `npm run build`                                                                                                                                                                                                                                      | 0; Nest build passed                                                 | `5236083759b0b2a639e30e8542684c2026048e9a8b2682072b19233fdfd04954` |
| `npx eslint $(git diff --name-only 9afc8ff..HEAD \| rg '\\.ts$')`                                                                                                                                                                                    | 0; no findings                                                       | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `npx prettier --check $(git diff --name-only 9afc8ff..HEAD)`                                                                                                                                                                                         | 0; all matched files use Prettier style                              | `17aa973d3f004560237d9a95171210b0671deff23d61628eecf7322ff5938f20` |
| `npm run lint`                                                                                                                                                                                                                                       | 1; established baseline 621 findings (587 errors, 34 warnings)       | `a18bb3424275610d37f8302b5afac5f0825cd88f8cd70a8c9194519a4885c72c` |
| `git diff --check 9afc8ff..HEAD`                                                                                                                                                                                                                     | 0; no whitespace errors                                              | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `git diff --name-only 9afc8ff..HEAD \| wc -l`                                                                                                                                                                                                        | 0; 19 scoped paths                                                   | `cd08c42964b37afdb09beee67900157ec6a3e3fd01b6f3e09a49e78680c7262f` |

Project-wide lint is an observation only; scoped lint/format are the passing Phase 3B checks. The 19-path inventory contains no 3A schema/entity/migration, 3C, 3D, or 3E path.

## Evidence Revision

`sha256:09480dd9b716765a50206c81840a1ccb4398838dd1f39e03f8c11c08787a8e26`

✅ Written: canonical final-ancestry ledger. ✅ Passed: replayed RED/GREEN pairs and bounded 3B.4 system proof. No push, PR, verify report, force-push, hard reset, interactive rebase, or umbrella edit occurred.
