# Apply Progress: Phase 2 Resident/Unit Administration

## Status

- Delivery strategy: `exception-ok`; maintainer explicitly authorized reset to a 500-line accounting budget without scope growth.
- Chain strategy: `feature-branch-chain`
- All tasks 1.1 through 6.2 are complete. The next recommended phase is `sdd-verify`.
- The parent retains native attempt token `sha256:0fd5439b253acc77a27400384f7bfd21dace6f87d6cc6655675b62ecfc145efb`; this artifact-only correction does not acquire or settle it.
- PR 1 `pr1-contracts-and-reads-budget-500` reached terminal complete with evidence revision `sha256:4e4015c4be18a3483785b132cedf0bc1cdbead170dd5adba94b33b16b693a8f4`.
- Native attempt token: `sha256:e66e9cd67bcd804e04804ec5f14d3e9f173141f0acd5a803aa250a73ebc140de`
- Native risk assessment: Medium. RDD: off.
- PR 2 `pr2-unit-identity-and-invariants` is complete. The isolated disposable PostgreSQL proof passed migration up, normalized-index inspection, migration revert, rollback inspection, and container cleanup.
- Cumulative settled state: PR 1 and PR 2 history is preserved; PR 3 `pr3-resident-identity-and-invariants` is settled under parent-retained native attempt token `sha256:6814ae2c746dde3c25ea7cfce15e88ff514779dc4ee3c9c396748f1d870f1e25` with settlement revision `sha256:ac87ceada1342808f8bd26d37f991dc82a963a6772fb441d0ec77b96e814f16a`; PR 4 `pr4-unit-archive-lifecycle` is settled under parent-retained native attempt token `sha256:b36d7a9546a53c7b070b4b43e4fb0d4f7ce38456b8f4931beced5352ff621780` with settlement revision `sha256:6c498cabd68da57d8ec555d1d565c127b6742ba7d8268b9eae7903393bfe50ca`; PR 5 `pr5-resident-archive-lifecycle` is settled under parent-retained native attempt token `sha256:a07a6c1ee288039791798bd829bf1acf56fa7225c4c1e1dcf124885b31c7ac8e` with settlement revision `sha256:f5aae6af48209906c3a7a8bffc820823c5bcff523a809a16af8f67c00734ca0d`.
- Remediation lineage: failed/remediated evidence revision `sha256:50a53bf47fa367a577b2986540a118397843ff13fbd9ca9f18410c882b4bcb86` is remediated by successful remediation settlement evidence revision `sha256:05fb1f36776c384e1a3b8ac71850cc48d048f758a8dc7b741e54ee1eeb44ec4c` under native attempt token `sha256:0c319179e88892d37044d8197e313aa039c3c806d5a9112918e20654f2708cba`; the old shared-volume credential failure remains historical evidence only.

## Task Completion

- [x] 1.1 RED: contract/read tests.
- [x] 1.2 GREEN: contract/read implementation.
- [x] 2.1 RED: unit identity and invariants.
- [x] 2.2 GREEN: unit identity and invariants.
- [x] 3.1 RED: resident identity and invariants.
- [x] 3.2 GREEN: resident identity and invariants.
- [x] 4.1 RED: unit archive lifecycle.
- [x] 4.2 GREEN: unit archive lifecycle.
- [x] 5.1 RED: resident archive lifecycle.
- [x] 5.2 GREEN: resident archive lifecycle.
- [x] 6.1 RED: acceptance and public contract.
- [x] 6.2 GREEN: acceptance and public contract.

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

- Unit and resident archive/filter/restore are complete.
- Existing JWT transport, ADMIN guards, Phase 0 error handling, boolean `active`, and deterministic list ordering were preserved.
- Tasks 1.1 through 6.2 are complete with verified evidence; no additional apply work unit is pending.

## Work Unit Evidence: PR 3 Resident Identity and Invariants

### Status

- Delivery strategy: `exception-ok`; chain strategy: `feature-branch-chain`.
- Historical work unit: `pr3-resident-identity-and-invariants`, parent boundary `ab832eb`.
- Native attempt token is retained by the parent: `sha256:6814ae2c746dde3c25ea7cfce15e88ff514779dc4ee3c9c396748f1d870f1e25`; settlement revision: `sha256:ac87ceada1342808f8bd26d37f991dc82a963a6772fb441d0ec77b96e814f16a`.
- This historical PR 3 slice completed tasks 3.1 and 3.2 only; archive metadata, archive visibility, archive/restore endpoints, and restore preconditions were implemented in the later resident-archive slice.

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

## Work Unit Evidence: PR 4 Unit Archive Lifecycle

### Status

- Delivery strategy: `exception-ok`; chain strategy: `feature-branch-chain`.
- Historical work unit: `pr4-unit-archive-lifecycle`, parent boundary `b9b7044`; parent-retained native attempt token: `sha256:b36d7a9546a53c7b070b4b43e4fb0d4f7ce38456b8f4931beced5352ff621780`; settlement revision: `sha256:6c498cabd68da57d8ec555d1d565c127b6742ba7d8268b9eae7903393bfe50ca`.
- This historical PR 4 slice completed tasks 4.1 and 4.2 only. Resident archive lifecycle and acceptance/OpenAPI were completed in later slices.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 4.1 | `src/units/units.service.spec.ts`, `src/migrations/1724600007000-AddUnitArchiveMetadata.spec.ts` | Unit + PostgreSQL migration contract | `npm test -- --runInBand units`: PASS — 2 suites, 8 tests after installing missing dependencies with `npm ci`. | FAIL — 2 suites; the archive migration module and `archive`/`restore` service methods were absent. | PASS — `npm test -- --runInBand units migrations`: 6 suites, 20 tests. | Added inactive/historical-resident and retained-access-event dependency branches, default/archive-explicit visibility, restore, and repeated no-op cases. | No behavior-changing refactor was needed; focused suite remained green. |
| 4.2 | Same PR 4 focused test files | Unit + PostgreSQL migration contract | Same safety net; new migration files were N/A. | Same paired task-4.1 RED run. | PASS — migration registration, archive metadata, controller routes, visibility, transactional lifecycle, and audit behavior compile and pass. | Migration up/down verifies actor FK, metadata index, and removal; service tests verify state preservation and no writes on rejected/no-op transitions. | No behavior-changing refactor was needed; focused suite remained green. |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Parent-observed `npm test -- --runInBand units`: PASS — 2 suites, 13 tests. Expanded TDD focused command: `npm test -- --runInBand units migrations`: PASS — 6 suites, 20 tests. |
| Runtime harness command/scenario and exact result | A uniquely named disposable PostgreSQL 16 container with no persistent volume ran all 8 migrations. Inspection returned `idx_units_archived_at`, `archived_at`, `archived_by_user_id`, and FK delete action `n` (`SET NULL`). `npm run migration:revert` reverted only `AddUnitArchiveMetadata1724600007000`; rollback inspection returned 0 archive columns and 0 archive indexes. The container was removed with `docker rm -f`; credentials were process-scoped and redacted. |
| Build command and exact result | `npm run build`: PASS — Nest build completed. |
| Rollback boundary | Disable archive writes, restore any archived units, then revert `1724600007000-AddUnitArchiveMetadata.ts`, its registration/spec, and the unit entity/DTO/service/controller/tests. This removes only unit archive behavior and preserves PR 1–3 contracts and identity invariants. |

### Verification and Accounting: PR 4

- `git diff --check`: PASS.
- Authored source/test change: 263 lines; full patch: 300 lines.
- An initial disposable container attempt omitted host port publishing, was removed immediately, and did not touch shared infrastructure; the succeeding proof above used host loopback port publishing only.

## Work Unit Evidence: PR 5 Resident Archive Lifecycle

### Status

- Delivery strategy: `exception-ok`; chain strategy: `feature-branch-chain`.
- Historical work unit: `pr5-resident-archive-lifecycle`, parent boundary `e4cca98`; parent-retained native attempt token: `sha256:a07a6c1ee288039791798bd829bf1acf56fa7225c4c1e1dcf124885b31c7ac8e`; settlement revision: `sha256:f5aae6af48209906c3a7a8bffc820823c5bcff523a809a16af8f67c00734ca0d`.
- This historical PR 5 slice completed tasks 5.1 and 5.2 only. HTTP acceptance/OpenAPI work was completed in the later acceptance slice.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 5.1 | `src/residents/residents.service.spec.ts`, `src/migrations/1724600008000-AddResidentArchiveMetadata.spec.ts` | Unit + PostgreSQL migration contract | `npm test -- --runInBand residents migrations`: PASS — 6 suites, 27 tests after `npm ci`; the initial command was infrastructure-blocked because Jest was absent. | FAIL — 7 suites with 5 failing tests: the resident archive migration and `archive`/`restore` methods were absent, and default archive filtering was absent. | PASS — `npm test -- --runInBand residents migrations`: 7 suites, 34 tests after metadata, lifecycle, filtering, and safe mapper changes. | Archive transition, inactive restore conflict, archived/default visibility, independent `active=false`, and repeated archive/restore no-op branches are covered. | Returned archive/restore resources through the existing allowlisted mapper to keep `archivedByUserId` internal; focused tests remained green. |
| 5.2 | Same PR 5 focused test files | Unit + PostgreSQL migration contract | Same 6-suite, 27-test safety net; new migration files were N/A. | Same paired task-5.1 RED run. | PASS — migration registration, entity mapping, ADMIN routes, unit-first locks, linked-user deactivation, restore preconditions, metadata visibility, audit transitions, and no-op behavior compile and pass. | Migration tests cover up/down actor FK and index removal; service tests cover archive, conflicts, no-op, safe response, and filter/state separation. | No further behavior-changing refactor was needed; `npm run build` and focused tests remained green. |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | Parent-observed `npm test -- --runInBand residents`: PASS — 2 suites, 23 tests. Expanded command: `npm test -- --runInBand residents migrations`: PASS — 7 suites, 34 tests. |
| Runtime harness command/scenario and exact result | A uniquely named disposable PostgreSQL 16 container with no persistent volume ran all 9 migrations successfully. Inspection returned `archived_at`, `archived_by_user_id`, `idx_residents_archived_at`, and `fk_residents_archived_by_user|n` (`SET NULL`). `npm run migration:revert` reverted `AddResidentArchiveMetadata1724600008000`; rollback inspection returned `0`, `0`, `0` for archive columns, index, and FK. Each container was removed with `docker rm -f`; credentials were process-scoped and redacted. |
| Build command and exact result | `npm run build`: PASS — Nest build completed. |
| Rollback boundary | Disable resident archive writes, restore archived residents, then revert `1724600008000-AddResidentArchiveMetadata.ts`, its registration/spec, and the resident entity/DTO/service/controller/tests. This removes only resident archive behavior and preserves PR 1–4 contracts, normalized identity, locks, and unit archival. |

### Verification and Accounting: PR 5

- `git diff --check`: PASS.
- PR 5 source/test authored change: 339 lines; full patch: 375 lines.
- No commit, push, or PR was created.
- Final HTTP acceptance and OpenAPI artifacts were deliberately deferred to, and completed in, the later acceptance slice.

### Focused Correction: Restore Preserves Inactive State

- Scope remained within completed task 5.2: successful resident restore now explicitly persists `active=false` for both the resident and its linked user while clearing archive metadata. Repeated restore remains an audit-free, write-free no-op.
- TDD safety net: `npm test -- --runInBand residents` PASS — 2 suites, 23 tests.
- RED: the new successful-restore regression failed because the restored resident remained active (`expected false, received true`).
- GREEN: `npm test -- --runInBand residents` PASS — 2 suites, 24 tests after the minimal service correction.
- Triangulation: the new drifted-active successful transition and the existing non-archived restore no-op cover the write and no-write paths; no refactor was needed.
- Rollback boundary: revert only the focused restore regression in `src/residents/residents.service.spec.ts` and inactive assignments/save in `src/residents/residents.service.ts`.
- Native attempt token remains retained by the parent: `sha256:f6577c4eb3e238ee46f88b1e74220e827d2623ad6f331093bfcf3b46087098ff`; this correction did not acquire or settle it.

## PR 6 Historical Attempt: Acceptance and Public Contract

### Status

- Delivery strategy: `exception-ok`; chain strategy: `feature-branch-chain`; the historical PR 6 boundary was based on `46eff5c` and targeted the immediate PR 5 predecessor.
- This initial evidence is historical only. Its native attempt token remained parent-retained and was not acquired or settled by this recorded attempt.
- At this initial evidence point, the required full `npm test -- --runInBand` command failed because `typeorm-metadata.spec.ts` used a fixed Compose harness that conflicted with the disposable PostgreSQL runtime boundary. That failure is remediated below.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 6.1 | `src/openapi/openapi-artifact.spec.ts`, `test/resident-unit-administration.e2e-spec.ts` | OpenAPI unit + HTTP E2E | `npm test -- --runInBand openapi/openapi-artifact.spec.ts`: PASS — 1 suite, 9 tests before changes. | OpenAPI contract test first: FAIL — 1 suite, 6 failures because archive lifecycle operations and `includeArchived` query parameters were absent from `docs/openapi/v1.json`. HTTP acceptance test then exposed 201 archive/restore responses and empty PATCH acceptance. | Focused tests PASS: OpenAPI 1 suite, 15 tests; HTTP E2E 1 suite, 4 tests. | Resident and unit list/detail archive filters, both empty PATCH routes, 401/403/404/409 envelopes, all archive/restore routes, safe projections, inactive state, and repeated target-state responses are covered. | Extracted `assertNonEmptyPatch` so transformed DTO properties with `undefined` values are correctly rejected; focused suites remained green. |
| 6.2 | Same PR 6 test files and `docs/openapi/v1.json` | OpenAPI generation + HTTP E2E | Same safety net. | Same paired task-6.1 RED evidence. | `npm run openapi:generate`, `npm run openapi:check`, focused OpenAPI, and focused HTTP E2E all PASS. | Generated public artifact proves four lifecycle routes, both archive filters, protected response schemas, and Phase 0 error schemas. | Prettier-only refactor; focused suites remained green. |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `npm test -- --runInBand openapi/openapi-artifact.spec.ts`: PASS — 1 suite, 15 tests. `npm run test:e2e -- --runInBand resident-unit-administration.e2e-spec.ts`: PASS — 1 suite, 4 tests. `npm test -- --runInBand common/pagination.dto.spec.ts openapi/openapi-artifact.spec.ts`: PASS — 2 suites, 23 tests. |
| Runtime harness command/scenario and exact result | A uniquely named disposable PostgreSQL 16 container without a persistent volume ran all 9 migrations with process-scoped credentials. It was removed by an EXIT trap. The focused HTTP E2E route harness passed. The required full unit command is blocked: `typeorm-metadata.spec.ts` always starts the fixed-name `sigra-phase0-local` Compose service; it failed because its fixed host port 55439 was occupied by the disposable boundary. The failed Compose container/network were explicitly removed; no shared database or persistent volume was used. |
| Rollback boundary | Revert `test/resident-unit-administration.e2e-spec.ts`, OpenAPI test/artifact changes, controller query/status decorators, and the non-empty PATCH/error-contract correction. This removes only PR 6 acceptance/OpenAPI behavior and restores prior contract behavior without touching PR 1–5 migrations or lifecycle services. |

### Verification and Accounting

- `npm run build`: PASS.
- `npm run openapi:check`: PASS.
- `git diff --check`: PASS.
- Required `npm test -- --runInBand`: FAIL — 30 suites/157 tests passed; `src/config/typeorm-metadata.spec.ts` failed when its fixed Compose harness attempted to bind 127.0.0.1:55439. This is runtime-harness isolation, not a resident/unit assertion failure.
- Authored source/test delta before generated OpenAPI: 425 lines (90 additions and 19 deletions in tracked TypeScript plus the 316-line acceptance test). Generated OpenAPI delta: 1,267 lines (1,031 additions and 236 deletions). Total working delta: 1,692 lines. The approved `size:exception` remains required because the immutable generated artifact cannot be truthfully reduced.
- No task checkbox was changed; no commit, push, or PR was created.

## PR 6 Evidence Remediation: Isolated Metadata Harness

### Status

- Historical failed evidence revision `sha256:5e50a32f85d8c17efe0f2139c9b68dacd8b61aaf88780a9d51c421eb7555428c` is explicitly remediated by passed evidence revision `sha256:7881ff75566a24def9c7936ccc0ef80824224c282399be61d990ce457a6cf78d`.
- The parent retains native attempt token `sha256:0fd5439b253acc77a27400384f7bfd21dace6f87d6cc6655675b62ecfc145efb`; this remediation and artifact-only correction do not acquire or settle it.
- Tasks 6.1 and 6.2 are complete because all required checks passed against an isolated disposable PostgreSQL runtime.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| 6.1 | `src/config/typeorm-metadata.spec.ts`, existing OpenAPI/E2E acceptance files | PostgreSQL harness + OpenAPI unit + HTTP E2E | `npm test -- --runInBand config/typeorm-metadata.spec.ts`: PASS — 1 suite, 15 tests before harness changes. | Added the disposable-container plan assertion first; focused run FAIL — 1 suite, 16 tests with `ReferenceError: createDisposablePostgresPlan is not defined`. | Focused metadata run PASS — 1 suite, 15 tests after the minimum direct Docker harness. Full required unit suite PASS — 31 suites, 158 tests. | The plan assertion proves unique naming, `postgres:16-alpine`, loopback dynamic port, process-scoped password injection, and no volume; the existing applied-catalog and canonical rollback test executes the real container path. Existing OpenAPI PASS — 15 tests; E2E PASS — 4 tests. | Removed only the obsolete Compose-service precondition assertion and replaced it with the stronger direct-container plan assertion; all catalog, migration, rollback, and acceptance assertions remain active. |
| 6.2 | Same PR 6 files plus `docs/openapi/v1.json` | OpenAPI generation + HTTP E2E + PostgreSQL runtime | Same PR 6 acceptance safety net recorded above. | Same paired task-6.1 RED evidence. | `npm run openapi:check`, `npm run build`, and required full suite all PASS using the isolated runtime. | Full suite exercises the metadata migration proof while the focused OpenAPI and E2E suites retain public-contract coverage. | No additional production behavior change was necessary for remediation; the correction is limited to the repository test harness. |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `npm test -- --runInBand config/typeorm-metadata.spec.ts`: PASS — 1 suite, 15 tests. Existing focused OpenAPI: PASS — 1 suite, 15 tests. Existing focused E2E: PASS — 1 suite, 4 tests. |
| Runtime harness command/scenario and exact result | A uniquely named `postgres:16-alpine` container was started with `127.0.0.1::5432`, process-scoped random credentials, no volume, and an isolated database. `npm run migration:run` applied 9 migrations; the required full suite, including metadata's independent disposable rollback proof, passed. An EXIT trap force-removed the proof container; post-run `docker ps -a` found no `sigra-schema-proof-*` or `sigra-pr6-proof-*` containers. |
| Rollback boundary | Revert only `src/config/typeorm-metadata.spec.ts` to restore the prior Compose-based metadata harness. No production behavior, migration, OpenAPI artifact, or acceptance assertion is part of this remediation boundary. |

### Required Proof

- `npm test -- --runInBand`: PASS — 31 suites, 158 tests.
- `npm run test:e2e -- --runInBand resident-unit-administration.e2e-spec.ts`: PASS — 1 suite, 4 tests.
- `npm run openapi:check`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.
- Generated artifact accounting: `docs/openapi/v1.json` remains generated and contributes 1,267 changed lines (1,031 additions, 236 deletions). The harness correction is 203 tracked TypeScript lines (113 additions, 90 deletions); it does not generate or alter public artifacts.
- Honest cumulative accounting: the initial PR 6 authored source/test delta was 425 lines and the harness correction added 203 tracked TypeScript lines, for 628 authored source/test lines; the generated OpenAPI artifact adds 1,267 lines, for a 1,895-line product delta. The maintainer-approved 500-line accounting reset and `size:exception` permit review handling only; they do not reduce these actual counts.
- No commit, push, or PR was created.

## Final Apply State

- Tasks 1.1 through 6.2 are all complete.
- Historical PR 6 failed evidence is remediated by the passed evidence revision recorded above.
- Full suite: PASS — 31 suites, 158 tests. E2E: PASS — 1 suite, 4 tests. OpenAPI check: PASS. Build: PASS.
- The dynamic disposable PostgreSQL harness ran the nine migrations with process-scoped credentials and no persistent volume; cleanup removed the proof containers.
- Structural verification for this artifact-only correction: `git diff --check` PASS.
- Next recommended phase: `sdd-verify`.

## Bounded Remediation: Failed Verification Revision `sha256:39ffd1c6dbc1934bc3f33e96183c5bbffc74ff1d9165455206e880c210181600`

- Parent retains native token `sha256:1008873ccc45519c31907e4bbb88a259dac7097e442eaf13840079f4b0566b33`; this remediation neither acquires nor settles it.
- Resident PATCH now accepts a transformed, normalized email, locks and updates its linked identity, preflights collisions, and returns the full allowlisted `ResidentResponseDto`.
- Resident create/update and unit create/update map returned resources through the established DTO mappers; the generated OpenAPI artifact was refreshed to declare the resident PATCH resource schema consistently.
- Resident query search is trimmed and lowercased before the `ILIKE` parameter is constructed.
- Session-foundation PostgreSQL tests now create a unique direct `postgres:16-alpine` container with a dynamic loopback port, random process-scoped credentials, no volume, migrations, and forced cleanup. Focused execution passed 5 suites / 49 tests; no matching containers or volumes remained.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| Resident email, safe mappers, lowercase search | `src/residents/resident.dto.spec.ts`, `src/residents/residents.service.spec.ts`, `src/units/units.service.spec.ts` | Unit | `npm test -- --runInBand residents units`: PASS — 4 suites, 37 tests | Added email-update, mapper-leak, and lowercase-search cases; 3 assertions failed before implementation | PASS — 4 suites, 40 tests | Canonical email and collision-preflight plus lowercase mixed-case search cover distinct branches | Updated existing entity fixtures to represent eager public relations; tests remained green |
| Session PostgreSQL isolation | `src/auth/session-foundation/postgres.spec.ts` | PostgreSQL integration | Existing focused command RED — 1 suite, 9 failures at fixed `127.0.0.1:55439` | Existing nine boundary behaviors pass under the disposable container — 1 suite, 9 tests | Readiness, row locking, two-writer race, classification, and cleanup execute against the dynamic endpoint | None needed |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `npm test -- --runInBand residents units auth/session-foundation/postgres.spec.ts`: PASS — 5 suites, 49 tests. |
| Runtime harness command/scenario and exact result | Direct PostgreSQL 16 container migrated and executed the nine session-foundation boundary tests on a dynamic loopback port; post-run matching containers=0 and matching volumes=0. |
| Rollback boundary | Revert the resident DTO/controller/service and tests, unit service/tests, session PostgreSQL harness, and regenerated OpenAPI artifact. This leaves historical Phase 2 lifecycle and migration work intact. |

### Required Command Status

- `npm run test:e2e -- --runInBand resident-unit-administration.e2e-spec.ts`: PASS — 1 suite, 4 tests.
- `npm run openapi:check`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.
- `npm test -- --runInBand`: FAIL — 30 suites passed, 1 metadata suite failed; 160 tests passed, 1 failed. The prior nine fixed-port session failures are resolved. `typeorm-metadata.spec.ts` now fails its existing disposable schema proof with `Connection terminated unexpectedly`; this is distinct from the remediated fixed-port path and remains blocking fresh verification.
- Authored changes from the current candidate exceed the 300-line cap due to required focused fixture updates and regenerated OpenAPI consistency; no code or tests were compressed or weakened to fit the budget. A maintainer `size:exception` decision is required before settlement.

## Final Bounded Remediation: Metadata Harness Readiness

- Failed evidence revision: `sha256:5cb082a15a402a0aed2677351bbfa461962b09ccce38c9f551087be2d5e04827`.
- Parent retains native token `sha256:4e843633df2d894a3b4341ea709dcfa6cb4ff06f734711b5dc3042aa92ae98f3`; this remediation neither acquires nor settles it.
- Diagnosis: the container-local `pg_isready` probe could return before PostgreSQL completed a query-ready startup state. TypeORM then raced that transition and its connection was terminated; cleanup subsequently attempted `DataSource.destroy()` against the already-disconnected source.
- Fix: replace the readiness probe with an authenticated `psql --command 'SELECT 1'` retry before TypeORM connects. The unique direct PostgreSQL 16 container, dynamic loopback port, process-scoped credentials, no volume, and forced `docker rm --force` cleanup are unchanged.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| Metadata harness readiness remediation | `src/config/typeorm-metadata.spec.ts` | PostgreSQL integration | Targeted suite: FAIL — 1 suite, 14 passed / 1 failed (`Connection terminated unexpectedly`), the authorized failed evidence | Added authenticated-readiness command assertion first; FAIL — 15 passed / 1 failed (`ReferenceError: postgresReadinessCommand is not defined`) | PASS — targeted suite run twice, 1 suite / 16 tests each | The command assertion and two live disposable-container executions cover the deterministic command and startup-race path; the full suite also passed | None needed; minimum helper replaced only the weak readiness probe |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `npm test -- --runInBand config/typeorm-metadata.spec.ts`: PASS — 1 suite, 16 tests (run twice after GREEN). |
| Runtime harness command/scenario and exact result | The focused runs and `npm test -- --runInBand` each started the direct disposable PostgreSQL 16 schema proof, completed migration/catalog/rollback behavior, and passed. Post-run inspection: matching `sigra-schema-proof-*` containers=0; matching volumes=0. |
| Rollback boundary | Revert only `postgresReadinessCommand`, its `waitForPostgres` use, and the focused assertion in `src/config/typeorm-metadata.spec.ts`; no production behavior or public contract changes are included. |

### Required Command Status

- `npm test -- --runInBand`: PASS — 31 suites, 162 tests.
- `npm run test:e2e -- --runInBand resident-unit-administration.e2e-spec.ts`: PASS — 1 suite, 4 tests.
- `npm run openapi:check`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.
- Current bounded-remediation delta: 32 additions, 0 deletions in `src/config/typeorm-metadata.spec.ts` relative to the received candidate; under the 120-line limit.
- `verify-report.md` was preserved unchanged for fresh independent verification. No commit, push, token acquisition, or token settlement occurred.

## Final Authorized Remediation: Session Datasource Import Order

- Failed evidence revision: `sha256:14f9d1b1c00ee4bfd8306a4a566ef2db8ce215ea8752c62ff93fc0e30c2166f0`.
- Parent retains native token `sha256:62565b548b1b70970b87a76eea74d9d274453ad6bbe1bb5e1bc279fb2f7f673b`; this remediation neither acquires nor settles it.
- Root cause: the session test's top-level `typeorm.datasource` import captured datasource options before its root `beforeAll` installed the disposable container environment, so Jest suite/module ordering could retain the default port `55439`.
- Fix: install the dynamic process-scoped environment first, then require `typeorm.datasource` and run migrations from those captured dynamic options. The unique PostgreSQL 16 container, dynamic loopback port, process-scoped credentials, no volumes, authenticated bounded readiness, and forced cleanup remain unchanged.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| Session datasource import-order remediation | `src/auth/session-foundation/postgres.spec.ts` | PostgreSQL integration | `npm test -- --runInBand auth/session-foundation/postgres.spec.ts`: PASS — 1 suite, 9 tests | Added the dynamic datasource-options assertion first; focused run failed because no post-environment datasource load existed. | `npm test -- --runInBand auth/session-foundation/postgres.spec.ts`: PASS twice — 1 suite, 10 tests each. | Two consecutive complete suite runs passed — 31 suites, 163 tests each — exercising the session boundary under independent Jest process/module ordering. | None needed; the minimum change removed the stale top-level import. |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `npm test -- --runInBand auth/session-foundation/postgres.spec.ts`: PASS twice — 1 suite, 10 tests each. |
| Runtime harness command/scenario and exact result | Both required full suites passed with the dynamic PostgreSQL 16 session harness: 31 suites, 163 tests each. Post-run matching session containers=0 and matching volumes=0. |
| Rollback boundary | Revert only the deferred datasource import and its dynamic-options assertion in `src/auth/session-foundation/postgres.spec.ts`; no production code, public contract, or verification report changes are included. |

### Required Command Status

- `npm test -- --runInBand`: PASS twice consecutively — 31 suites, 163 tests each.
- `npm run test:e2e -- --runInBand resident-unit-administration.e2e-spec.ts`: PASS — 1 suite, 4 tests.
- `npm run openapi:check`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.
- Remediation delta relative to the received candidate: 11 additions, 1 deletion in `src/auth/session-foundation/postgres.spec.ts` (12 changed lines), within the 120-line limit.
- `verify-report.md` was preserved unchanged. No commit, push, token acquisition, or token settlement occurred.

## Maintainer-Authorized Final Evidence Slice

### Status

- Failed verification revision remediated: `sha256:854b6d6ed9d60593d8fcbc9dc6c21c89726e36efb13a0ae8f096b9c2ba709075`.
- The parent retains native token `sha256:e8548db4d61d101967e8837015bd043e95dde10f301b440fc9d0f375a1feabcb`; this work neither acquires nor settles it.
- Delivery strategy remains `exception-ok`; chain strategy remains `feature-branch-chain`. This is the final PR 6 evidence slice and includes no commit or shared-infrastructure change.
- `verify-report.md` was preserved unchanged for independent fresh verification.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| Final PostgreSQL evidence | `test/resident-unit-administration.e2e-spec.ts` | Production Nest HTTP + TypeORM + PostgreSQL 16 | Historical mocked HTTP suite passed: 1 suite, 4 tests | Replaced mocked-service assertions with PostgreSQL migration/HTTP proof; initial focused run failed on rollback index aliasing, missing production-stack keyring setup, unpopulated resident response relations, and lockable eager relation SQL. | `npm run test:e2e -- --runInBand resident-unit-administration.e2e-spec.ts`: PASS — 1 suite, 4 tests. | Concurrent normalized unit/email writes; assignment and reactivation races; Phase 2 collision preflight/rollback; archive state and audit-trigger rollback; HTTP lifecycle/no-op/pagination/errors all execute non-trivial paths. | Extracted only local disposable-container helpers; no production behavior was generalized beyond defects exposed by the real boundary. |
| Session harness readiness | `src/auth/session-foundation/postgres.spec.ts` | PostgreSQL 16 integration | Required full suite RED: session PostgreSQL boundary failed 10 tests with `ECONNRESET`. | Focused `npm test -- --runInBand auth/session-foundation/postgres.spec.ts`: PASS — 1 suite, 10 tests; required full suite PASS — 31 suites, 163 tests. | The authenticated query readiness probe and all ten real session scenarios execute under a fresh dynamic endpoint. | Reused the authenticated `psql SELECT 1` pattern already established by the metadata harness; container isolation remains unchanged. |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | `npm run test:e2e -- --runInBand resident-unit-administration.e2e-spec.ts`: PASS — 1 suite, 4 tests. `npm test -- --runInBand auth/session-foundation/postgres.spec.ts`: PASS — 1 suite, 10 tests. |
| Runtime harness command/scenario and exact result | Each focused acceptance run starts one unique `postgres:16-alpine` container with `127.0.0.1::5432`, random process-scoped credentials, authenticated bounded `psql SELECT 1` readiness, no volume, nine migrations, and forced removal. It proves concurrent normalized unit/email conflicts; overlapping assignment/reactivation and deactivation outcomes; collision preflight without indexes; composed Phase 2 rollback and reapply; archive/audit rollback through real trigger failure; and Nest controller/service/TypeORM HTTP paths. Post-required-run inspection found matching `sigra-resident-unit-proof-*` containers=0 and volumes=0. |
| Rollback boundary | Revert `test/resident-unit-administration.e2e-spec.ts` for the proof slice. The two production corrections are independently reversible: `src/config/database.config.ts` excludes test files from the runtime migration glob, and `src/residents/residents.service.ts` locks only the resident table and supplies a loaded unit to the allowlisted response mapper. Revert the session authenticated readiness probe separately if necessary. |

### Required Command Status

- `npm test -- --runInBand`: PASS — 31 suites, 163 tests.
- `npm run test:e2e -- --runInBand resident-unit-administration.e2e-spec.ts`: PASS — 1 suite, 4 tests.
- `npm run openapi:check`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.
- Production services were not mocked in the resident/unit acceptance file. The only direct SQL is setup, deterministic tie seeding, migration-state inspection, lock orchestration, and audit-failure injection; all asserted public behavior traverses Nest controllers, guards, real services, TypeORM, and PostgreSQL.
- No persistent volume was requested or created; matching disposable container and volume counts are both zero.

## Bounded Final Test-Evidence Remediation

### Status

- Failed verification evidence targeted: `sha256:ddcb9bb6c69136ccc856f7cce1621008ddedcab5f8aafd117971b7390e901f63`.
- Parent retains native attempt token `sha256:118d74256e7c1d1e390edeb07fc570454caf09f9f3c69c60b2dfbfe95acb25af`; this remediation neither acquires nor settles it.
- Delivery strategy remains `exception-ok`; chain strategy remains `feature-branch-chain`. This bounded PR 6 evidence slice adds real PostgreSQL 16 production-stack scenarios only and creates no commit.
- `verify-report.md` was preserved unchanged for independent verification.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| Final critical evidence remediation | `test/resident-unit-administration.e2e-spec.ts`, `src/residents/resident.dto.ts` | Production Nest HTTP + TypeORM + PostgreSQL 16 | `npm run test:e2e -- --runInBand resident-unit-administration.e2e-spec.ts`: PASS — 1 suite, 4 tests | Test-first run: FAIL — 1 suite, 6 passed / 3 failed. The archived whitespace-normalized resident-email create returned 400 instead of required 409, exposing missing create-DTO normalization before validation; two fixture interactions were corrected without weakening assertions. | `npm run test:e2e -- --runInBand resident-unit-administration.e2e-spec.ts`: PASS — 1 suite, 9 tests after adding the minimum create-email transform. | Archived create/update collisions cover resident email and unit code; lists cover default/archive inclusion and two tied pages; restore covers success, missing identity, and audit-trigger rollback; unit transitions cover archive/restore and repeated no-op. | No refactor needed; test helpers preserve one real HTTP boundary and production resident/unit services remain unmocked. |

### Work Unit Evidence

| Evidence | Result |
|---|---|
| Focused test command and exact result | RED: `npm run test:e2e -- --runInBand resident-unit-administration.e2e-spec.ts` FAIL — 1 suite, 6 passed / 3 failed. GREEN: same command PASS — 1 suite, 9 tests. |
| Runtime harness command/scenario and exact result | The focused and required E2E runs each started a uniquely named `postgres:16-alpine` container with a dynamic loopback port, authenticated bounded `psql SELECT 1` readiness, process-scoped random credentials, no persistent volume, and nine migrations. Real Nest controllers, guards, resident/unit services, TypeORM, and PostgreSQL proved archived normalized identity reservation, resident archive collection/tied pagination, restore audit/identity/inactive state, unit archive no-write/audit semantics, and resident 400/401/403/404/409 envelopes with mutation checks. Post-run matching containers=0 and matching volumes=0. |
| Rollback boundary | Revert the final scenarios and `expectError` helper in `test/resident-unit-administration.e2e-spec.ts`, plus the create-email `@Transform` in `src/residents/resident.dto.ts`. This removes only final acceptance evidence and pre-validation create-email normalization without altering prior archive, migration, or contract behavior. |

### Required Command Status

- `npm test -- --runInBand`: PASS — 31 suites, 163 tests.
- `npm run test:e2e -- --runInBand resident-unit-administration.e2e-spec.ts`: PASS — 1 suite, 9 tests.
- `npm run openapi:check`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.
- Production resident/unit services were not mocked. Direct SQL was limited to deterministic fixtures, persisted-state/audit inspection, migration proof, lock orchestration, and audit-failure or missing-identity fault injection.
- The final remediation adds 97 test lines and 3 production DTO lines relative to the received acceptance harness; it is within the 700-line slice cap. No commit, push, token acquisition, or token settlement occurred.
