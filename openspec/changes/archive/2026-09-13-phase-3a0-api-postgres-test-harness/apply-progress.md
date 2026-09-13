# Apply Progress: Phase 3A0 API PostgreSQL Test Harness

## Completed Tasks

- [x] 1.1–1.3 Baseline and RED proof
- [x] 2.1–2.2 GREEN helper and focused checkpoint
- [x] 3.1–3.2 Resident lifecycle retrofit and regression
- [x] 4.1–4.2 Evidence and hard gate

## TDD Cycle Evidence

| Tasks | RED | GREEN | REFACTOR |
|---|---|---|---|
| 1.2–1.3, 2.1–2.2 | Observed focused suite failure: `startDisposablePostgres is not a function` (4 tests) before helper implementation. | Focused mocked command passed 1 suite, 4 tests; no Docker was invoked. | Kept only typed helper/process behavior and mocked custom promisification. |
| 3.1–3.2 | No new resident scenario assertions were added; lifecycle-only retrofit retained all nine existing bodies. | Real Docker PostgreSQL 16 resident command passed 1 suite, 9 tests. | Teardown aggregates close/destroy/stop failures while preserving bootstrap and scenarios. |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command | `npm run test:e2e -- --runInBand --runTestsByPath test/support/disposable-postgres.e2e-spec.ts` — passed: 1 suite, 4 tests. |
| Runtime harness | `npm run test:e2e -- --runInBand --runTestsByPath test/resident-unit-administration.e2e-spec.ts` — passed: 1 suite, 9 tests against ephemeral PostgreSQL 16; `docker ps -a` found no `resident-unit-proof-` container afterward. |
| Full regression | `npm run test:e2e -- --runInBand` — passed: 5 suites, 29 tests. |
| Quality commands | `npm run build` and `git diff --check` passed. `npm run lint` exited 1 with 627 pre-existing issues in the resident E2E and other existing test files; scoped `npx eslint test/support/disposable-postgres.ts test/support/disposable-postgres.e2e-spec.ts` passed. |
| Clean baseline lint | Exact `origin/develop` commit `40be73f5aa067f3088da97cc506d2517be085e96` independently exited 1 with 630 problems across 17 files, proving the repository-wide lint failure predates this candidate. |
| Review hard gate | Superseded by the final measured correction evidence below. |
| Rollback boundary | Delete `test/support/disposable-postgres.ts` and `test/support/disposable-postgres.e2e-spec.ts`, then restore only lifecycle changes in `test/resident-unit-administration.e2e-spec.ts`. |

## Delivery Boundary

Feature-branch-chain PR #1 prerequisite slice, based on the Phase 3 tracker. No package, config, schema, production, application, or commit changes were made.

## Gatekeeper Correction Evidence

**Failed evidence revision**: `sha256:6f751a002fbf338ed761d2695215e2c346402d8c9d1b839b76535cdaf6eaf8ad`
**Parent remediation token**: `sha256:31f0e4d191b454c04cd76cb9c5b84f6f75950803370d531e488490a95557b21f` (not acquired or settled)

| Correction | Evidence |
|---|---|
| Lifecycle formatting | The three candidate lifecycle statements were corrected. `npx prettier --config .prettierrc --check` on an exact isolated copy passed; baseline resident formatting was untouched. |
| Process protocol | Focused mocks prove executable `docker`, exact argv, `shell:false`, and 20,000/1,000/5,000/5,000 ms options for run/readiness/port/removal. |
| Error, naming, and retry proof | Tests inspect both `AggregateError.errors`, prove operation-context errors, validate unique safe database/user identifiers under 64 chars, and prove 60 probes with 59 250 ms delays. |
| Commands | Focused helper: exit 0, 1 suite/4 tests. Resident runtime: exit 0, 1 suite/9 tests. Full E2E: exit 0, 5 suites/29 tests. Build and `git diff --check`: exit 0. Scoped support ESLint: exit 0 with no diagnostics. |
| Lint comparison | `npm run lint`: exit 1, 625 problems (591 errors, 34 warnings), versus proven clean-`origin/develop` baseline 630 (596 errors, 34 warnings). Scoped support lint and targeted candidate-lifecycle Prettier pass; remaining global diagnostics are baseline debt outside candidate lifecycle lines. |
| Cleanup | Final Docker inspection returned no `resident-unit-proof-` or `proof-` containers. No harness process remained other than the inspection shell/`rg`. |
| Final exact count | Re-measured from `HEAD`: tracked 76 + untracked 167 = **243 additions + deletions** across the three implementation paths, below 400. This corrects the evidence record with the final measured breakdown. |

### Correction Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command | `npm run test:e2e -- --runInBand --runTestsByPath test/support/disposable-postgres.e2e-spec.ts` — exit 0; 1 suite, 4 tests. |
| Runtime harness command | `npm run test:e2e -- --runInBand --runTestsByPath test/resident-unit-administration.e2e-spec.ts` — exit 0; 1 suite, 9 tests against Docker PostgreSQL 16. |
| Rollback boundary | Delete the two support files and restore only the resident E2E lifecycle changes; no package, config, schema, or production behavior is involved. |
