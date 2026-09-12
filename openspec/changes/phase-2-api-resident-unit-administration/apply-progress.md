# Apply Progress: Phase 2 Resident/Unit Administration

## Status

- Delivery strategy: `exception-ok`; maintainer explicitly authorized reset to a 500-line accounting budget without scope growth.
- Chain strategy: `feature-branch-chain`
- PR 1 `pr1-contracts-and-reads-budget-500` reached terminal complete with evidence revision `sha256:4e4015c4be18a3483785b132cedf0bc1cdbead170dd5adba94b33b16b693a8f4`.
- Native attempt token: `sha256:e66e9cd67bcd804e04804ec5f14d3e9f173141f0acd5a803aa250a73ebc140de`
- Native risk assessment: Medium. RDD: off.
- PR 2 `pr2-unit-identity-and-invariants` is complete. The isolated disposable PostgreSQL proof passed migration up, normalized-index inspection, migration revert, rollback inspection, and container cleanup.
- Cumulative settled state: PR 1 and PR 2 history is preserved; PR 3 `pr3-resident-identity-and-invariants` is settled under parent-retained native attempt token `sha256:6814ae2c746dde3c25ea7cfce15e88ff514779dc4ee3c9c396748f1d870f1e25` with settlement revision `sha256:ac87ceada1342808f8bd26d37f991dc82a963a6772fb441d0ec77b96e814f16a`.
- Remediation lineage: failed/remediated evidence revision `sha256:50a53bf47fa367a577b2986540a118397843ff13fbd9ca9f18410c882b4bcb86` is remediated by successful remediation settlement evidence revision `sha256:05fb1f36776c384e1a3b8ac71850cc48d048f758a8dc7b741e54ee1eeb44ec4c` under native attempt token `sha256:0c319179e88892d37044d8197e313aa039c3c806d5a9112918e20654f2708cba`; the old shared-volume credential failure remains historical evidence only.

## Task Completion

- [x] 1.1 RED: contract/read tests.
- [x] 1.2 GREEN: contract/read implementation.
- [x] 2.1 RED: unit identity and invariants.
- [x] 2.2 GREEN: unit identity and invariants.
- [x] 3.1 RED: resident identity and invariants.
- [x] 3.2 GREEN: resident identity and invariants.
- [ ] 4.1 RED: unit archive lifecycle.
- [ ] 4.2 GREEN: unit archive lifecycle.
- [ ] 5.1 RED: resident archive lifecycle.
- [ ] 5.2 GREEN: resident archive lifecycle.
- [ ] 6.1 RED: acceptance and public contract.
- [ ] 6.2 GREEN: acceptance and public contract.

## TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 1.1 | `src/residents/resident.dto.spec.ts`, `src/units/unit.dto.spec.ts`, `src/common/pagination.dto.spec.ts`, service specs | Unit | Writer-reported baseline: 20/20 passed | Writer-reported test-first run: 5 suites failed / 6 expected failures before implementation | Writer-reported final: `npm test -- --runInBand residents units common` PASS — 6 suites, 33 tests | Normalization, safe projection, boolean `active`, empty/non-empty PATCH, list ordering, and two detail projections | Writer-reported mapper and normalization extraction; final focused suite passed |
| 1.2 | Same PR 1 focused test files | Unit | Writer-reported baseline: 20/20 passed | Writer-reported test-first failure: 5 suites failed / 6 expected failures before implementation | Writer-reported final: `npm test -- --runInBand residents units common` PASS — 6 suites, 33 tests | Both resident and unit projections; both normalization branches; empty and boolean PATCH bodies | Writer-reported shared non-empty PATCH pipe and DTO mapper boundaries; final focused suite passed |
| 2.1 | `src/units/units.service.spec.ts`, `src/migrations/1724600005000-HardenUnitIdentity.spec.ts` | Unit + PostgreSQL migration contract | `npm test -- --runInBand units migrations`: PASS — 3 suites, 7 tests before changes | RED: focused run failed because `HardenUnitIdentity1724600005000` did not exist; the service assertions also failed because writes retained uppercase code and deactivation did not acquire `pessimistic_write`. | GREEN: focused run PASS — 2 suites, 9 tests; required focused run PASS — 4 suites, 12 tests. | Covers canonical create code, normalized preflight/index collision diagnostics, reversible down SQL, active resident rejection, inactive resident deactivation, and deterministic unit-first lock acquisition. | No behavior-changing refactor was needed after the minimal migration/service implementation; focused tests remained green. |
| 2.2 | Same PR 2 focused test files | Unit + PostgreSQL migration contract | Same 3-suite, 7-test safety net before modifying existing files; new migration file was N/A. | RED: same explicitly paired task-2.1 failing suite referenced the absent migration and missing canonical/lock behavior. | GREEN: `npm test -- --runInBand units migrations` PASS — 4 suites, 12 tests; `npm run build` PASS. | The migration test covers success, collision abort before DDL, and reverse constraint restoration; service tests cover canonical and active/inactive branches. | Extracted `canonicalizeUnitCode`; focused tests remained green. |

## Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Writer-reported: `npm test -- --runInBand residents units common`: PASS — 6 suites, 33 tests. Parent-observed spot-check: same focused suite PASS — 6 suites, 33 tests. |
| Runtime harness command/scenario and exact result | Writer-reported: `npm run build`: PASS — Nest build completed. HTTP runtime is N/A for this contract/read slice; end-to-end acceptance is explicitly PR 6 scope. |
| Rollback boundary | Revert `src/common/non-empty-patch.pipe.ts`, pagination/DTO mapper changes, resident/unit controllers and services, and their PR 1 tests. This removes only contract/read behavior and leaves future archive, migration, and lifecycle work untouched. |

## Work Unit Evidence: PR 2 Unit Identity and Invariants

| Evidence | Result |
|---|---|
| Focused test command and exact result | Parent-observed spot-check rerun: `npm test -- --runInBand units migrations`: PASS — 4 suites, 12 tests. |
| Runtime harness command/scenario and exact result | Historical shared-volume run: blocked by absent/mismatched credentials and not reused. Remediation: a uniquely named disposable PostgreSQL 16 container with no persistent volume became ready on attempt 2; process-scoped database variables ran `npm run migration:run` successfully, inspection proved `uq_units_code_normalized` exists and `units_code_key` is absent, `npm run migration:revert` succeeded, rollback inspection proved the index absent and raw-code unique constraint restored, and `docker rm -f` removed the container. Temporary credentials were not persisted or reported. |
| Rollback boundary | Revert `src/migrations/1724600005000-HardenUnitIdentity.ts`, its spec, the registration in `src/config/typeorm.datasource.ts`, and the PR 2 unit entity/service/test changes. This removes only normalized unit identity and deactivation locking, leaving PR 1 contracts/mappers and all resident/archive work untouched. |

## Verification and Accounting

- Writer-reported `npm ci`: PASS; installed 768 packages, with deprecation and audit warnings.
- Writer-reported final `npm test -- --runInBand residents units common`: PASS — 6 suites, 33 tests.
- Writer-reported final `npm run build`: PASS.
- Writer-reported final `git diff --check`: PASS.
- Parent-observed focused-suite spot-check: PASS — 6 suites, 33 tests.
- Writer-reported source/test authored change: 382 lines (368 additions, 14 deletions).
- Native attempt accounting: 466 lines because selected untracked `tasks.md` and `apply-progress.md` were included.
- PR 2 source/test authored change: 209 lines (207 additions, 2 deletions); no generated files included.
- PR 2 parent-observed spot-check rerun `npm test -- --runInBand units migrations`: PASS — 4 suites, 12 tests.
- PR 2 final `npm run build`: PASS.
- PR 2 final `git diff --check`: PASS.
- PR 2 historical PostgreSQL proof: PARTIAL — the shared Compose volume rejected available credentials; it was not modified.
- PR 2 remediation PostgreSQL proof: PASS — disposable PostgreSQL 16 container, migration up, expected normalized-index state, migration revert, rollback state, and forced container removal all passed.

## Scope Notes

- Archive visibility/filter and restore behavior remain unimplemented for later authorized slices.
- Existing JWT transport, ADMIN guards, Phase 0 error handling, boolean `active`, and deterministic list ordering were preserved.
- Tasks 1.1 through 3.2 are complete with verified evidence; the next authorized work unit is PR 4.

## Work Unit Evidence: PR 3 Resident Identity and Invariants

### Status

- Delivery strategy: `exception-ok`; chain strategy: `feature-branch-chain`.
- Current work unit: `pr3-resident-identity-and-invariants`, parent boundary `ab832eb`.
- Native attempt token is retained by the parent: `sha256:6814ae2c746dde3c25ea7cfce15e88ff514779dc4ee3c9c396748f1d870f1e25`; settlement revision: `sha256:ac87ceada1342808f8bd26d37f991dc82a963a6772fb441d0ec77b96e814f16a`.
- Completed only tasks 3.1 and 3.2; archive metadata, archive visibility, archive/restore endpoints, and restore preconditions remain PR 5 scope.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 3.1 | `src/residents/residents.service.spec.ts`, `src/migrations/1724600006000-HardenResidentIdentity.spec.ts` | Unit + PostgreSQL migration contract | `npm test -- --runInBand residents migrations`: PASS — 4 suites, 18 tests before changes (after `npm ci`; the initial runner invocation was infrastructure-blocked because Jest was absent). | `npm test -- --runInBand residents migrations`: FAIL — 2 suites, 2 tests; absent `HardenResidentIdentity1724600006000`, missing create unit lock, and missing reactivation invariant. | PASS — 5 suites, 23 tests after the minimal migration, canonical identity, and locking implementation. | Added reassign success and moved-resident race cases; final focused run PASS — 5 suites, 25 tests. | No behavior-changing refactor was needed; final focused run remained green. |
| 3.2 | Same PR 3 focused test files | Unit + PostgreSQL migration contract | Same 4-suite, 18-test safety net; new migration file was N/A. | Same paired task-3.1 RED run. | PASS — normalized preflight/canonicalization/index/down behavior and unit-first locks compile and pass. | Migration tests cover success, collision abort before DDL, and down restoration; service tests cover canonical create, inactive reactivation rejection, sorted reassignment locks, and stale assignment conflict. | No behavior-changing refactor was needed; final focused run remained green. |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Parent-observed spot-check: `npm test -- --runInBand residents migrations`: PASS — 5 suites, 25 tests. |
| Runtime harness command/scenario and exact result | A uniquely named disposable PostgreSQL 16 container without a persistent volume became ready within the bounded 30-attempt `pg_isready` loop. Process-scoped credentials ran `npm run migration:run` (7 migrations) successfully. Schema inspection returned `uq_users_email_normalized|CREATE UNIQUE INDEX uq_users_email_normalized ON public.users USING btree (lower(btrim((email)::text)))` and no `users_email_key` row. `npm run migration:revert` reverted `HardenResidentIdentity1724600006000`; rollback inspection returned `users_email_key|UNIQUE (email)` and no normalized-index row. The forced `docker rm -f` cleanup completed; credentials were neither persisted nor reported. |
| Build command and exact result | `npm run build`: PASS — Nest build completed. |
| Rollback boundary | Revert `src/migrations/1724600006000-HardenResidentIdentity.ts`, its spec, the registration in `src/config/typeorm.datasource.ts`, the `User.email` metadata change, and PR 3 resident service/test changes. This removes only normalized user/resident email identity and resident unit-first locking, leaving PR 1 contracts and PR 2 unit identity intact. |

### Verification and Accounting: PR 3

- `git diff --check`: PASS.
- Authored source/test change from parent boundary `ab832eb`: 343 lines (328 additions, 15 deletions); no generated files. This is within the 400-line maximum.
- `npm ci`: PASS — installed 768 packages; dependency audit warnings were not changed by this work unit.
