```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:042866180e2042a20281c4a94f6bef7b39501998a233c11ceb5464b349491186
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 8/8
scenarios: 20/20
test_command: npm test -- --runInBand
test_exit_code: 0
test_output_hash: sha256:0d9fefc41241852f2cc3c68bad354fa830a8974ad138632d2a2e5ee667cad08c
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:5236083759b0b2a639e30e8542684c2026048e9a8b2682072b19233fdfd04954
```

## Verification Report

**Change**: phase-2-api-resident-unit-administration
**Version**: N/A
**Mode**: Strict TDD
**Artifact store**: OpenSpec
**Evidence basis**: Fresh independent source inspection and execution on 2026-09-12. All proposal, specification, design, task, apply-progress, exploration, and prior verification artifacts were read. The implementation, four Phase 2 migrations, generated OpenAPI, and related unit, PostgreSQL, migration, HTTP, and OpenAPI tests were inspected. No `openspec/config.yaml` exists, so no additional `rules.verify` applied. The parent-retained native attempt token was neither acquired nor settled.

### Completeness

| Metric | Value |
|---|---:|
| Requirements | 8 |
| Scenarios | 20 |
| Tasks total | 12 |
| Tasks checked | 12 |
| Tasks incomplete | 0 |

All tasks are checked, so full verification proceeded.

### Build, Tests, OpenAPI, and Cleanup Evidence

| Check | Exact command | Exit | Fresh result | Output hash |
|---|---|---:|---|---|
| Required full Jest suite | `npm test -- --runInBand` | 0 | 31/31 suites and 163/163 tests passed. | `sha256:0d9fefc41241852f2cc3c68bad354fa830a8974ad138632d2a2e5ee667cad08c` |
| Required production-stack acceptance | `npm run test:e2e -- --runInBand resident-unit-administration.e2e-spec.ts` | 0 | 1/1 suite and 9/9 tests passed against PostgreSQL 16. | `sha256:6f3805f0bcec6dd757108242faf717a372cc5858bba74fbe75eccb3d3d16edbc` |
| Required OpenAPI freshness | `npm run openapi:check` | 0 | Nested build and artifact comparison passed. | `sha256:3fe5f286062cd7a383fa42df1d1385d121f05d88bc8913acca4beca2ef3fea15` |
| Required build/type-check | `npm run build` | 0 | Nest build passed. | `sha256:5236083759b0b2a639e30e8542684c2026048e9a8b2682072b19233fdfd04954` |
| Required whitespace check | `git diff --check` | 0 | Passed with empty output. | `sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Strict-TDD focused coverage | `npm test -- --runInBand residents units migrations common/pagination.dto.spec.ts openapi/openapi-artifact.spec.ts --coverage --coverageDirectory=/tmp/opencode/phase2-closure-coverage` | 0 | 11/11 suites and 74/74 tests passed; selected-source line coverage 26.65%. | `sha256:8471a1d384b5e62583bd916df36a08e83c4173cbb71bfb3b8584028ab9fc635c` |
| Strict-TDD scoped lint | `npx eslint <15 changed TypeScript files>` | 1 | 601 findings: 567 errors and 34 warnings; informational under the Strict-TDD quality rule. | `sha256:d9acf73b1cf5704a84fba574cf962e948a72a2e24aba80ffd9e2d10fddb6faf2` |
| PostgreSQL cleanup | `docker ps -a ...` and `docker volume ls ...` for `sigra-resident-unit-proof-*`, `sigra-schema-proof-*`, and `sigra-session-proof-*` | 0 | Matching containers: 0; matching volumes: 0. | `sha256:3d5a06f5ce644c250b423063e859e56ae352460c820f188573928337ff994dc1` |

The acceptance suite imports `AppModule`, compiles the real Nest application, applies all nine migrations, and exercises controllers, guards, production resident/unit services, TypeORM, and a disposable `postgres:16-alpine` database. It contains no `jest.mock`, `overrideProvider`, provider replacement, or resident/unit service mock. Direct SQL is limited to deterministic setup, migration-state inspection, lock orchestration, persisted-state/audit inspection, and fault injection. No persistent volume is requested.

### Specification Compliance Matrix

| Requirement | Scenario | Concrete passing evidence | Result |
|---|---|---|---|
| Safe resident reads and validation | Detail and filtered list | Production-stack archived/default detail and resident filtered collection checks pass; service projection tests and the tied-page E2E test prove safe mapping and `createdAt DESC, id DESC`. | ✅ COMPLIANT |
| Safe resident reads and validation | Archived visibility and empty patch | E2E proves archived residents are excluded by default, included explicitly, hidden by default detail, and resident `{}` PATCH returns a Phase 0 400 without state change. | ✅ COMPLIANT |
| Normalized identity and active-unit invariant | Concurrent normalized collision | E2E concurrent case/whitespace-equivalent creates produce 201/409 and leave one normalized PostgreSQL identity. | ✅ COMPLIANT |
| Normalized identity and active-unit invariant | Unit deactivation race | E2E overlaps assignment/reactivation with deactivation and proves 200/409 outcomes with zero active residents on inactive units. | ✅ COMPLIANT |
| Normalized identity and active-unit invariant | Archived email remains reserved | E2E archives the owner, then proves equivalent create and update both return Phase 0 409 through the normalized PostgreSQL index. | ✅ COMPLIANT |
| Reversible resident archive lifecycle | Archive and restore | E2E proves HTTP 200 archive/restore, linked access disablement, `RESIDENT_ARCHIVED`/`RESIDENT_RESTORED` transition audits, and transactional audit-failure rollback. | ✅ COMPLIANT |
| Reversible resident archive lifecycle | Restore conflict | Passing service execution proves inactive-unit rejection without writes/audit; E2E removes the linked identity, receives Phase 0 409, and proves the resident remains archived. | ✅ COMPLIANT |
| Reversible resident archive lifecycle | Restore does not activate | E2E and service tests prove cleared archive metadata while resident and linked user remain inactive. | ✅ COMPLIANT |
| Reversible resident archive lifecycle | Archive lifecycle no-op separation | E2E plus parameterized service execution prove repeated archive/restore success without resource writes, activation changes, or extra audit events. | ✅ COMPLIANT |
| Migration, authorization, errors, and contract proof | Collision-safe resident-email migration | Live PostgreSQL rollback restores `users_email_key`; legacy normalized collision diagnostics occur before index creation; reapplication restores the normalized index. | ✅ COMPLIANT |
| Migration, authorization, errors, and contract proof | Non-admin and malformed requests | E2E proves resident 401/403/400/404/409 Phase 0 responses and persistence non-mutation; HTTP-contract and OpenAPI tests prove the complete envelope schema. | ✅ COMPLIANT |
| Safe unit reads and validation | Detail and archive filter | E2E and service tests prove safe projections plus default-hidden and explicit archive visibility. | ✅ COMPLIANT |
| Safe unit reads and validation | Empty PATCH and stable page | E2E proves `{}` returns 400 and persisted equal timestamps paginate by descending UUID tie-breaker. | ✅ COMPLIANT |
| Normalized unit uniqueness and independent activation | Normalized code collision | E2E concurrent normalized creates and archived-owner create/update attempts return deterministic 409 conflicts under PostgreSQL. | ✅ COMPLIANT |
| Normalized unit uniqueness and independent activation | Active resident blocks deactivation | Service and E2E race execution prove active resident links reject deactivation and preserve the invariant. | ✅ COMPLIANT |
| Normalized unit uniqueness and independent activation | Historical resident does not block deactivation | Passing service execution proves only active residents block deactivation and boolean `active` changes independently of archive state. | ✅ COMPLIANT |
| Reversible unit archive lifecycle and dependency protection | Archive and restore independent state | E2E proves HTTP lifecycle, archived-code reservation, visibility, unchanged boolean activation, and exactly one audit per transition. | ✅ COMPLIANT |
| Reversible unit archive lifecycle and dependency protection | Any dependency blocks archive | E2E proves resident dependency conflict; service tests prove historical resident and retained access-history conflicts with no save or audit. | ✅ COMPLIANT |
| Reversible unit archive lifecycle and dependency protection | Archive lifecycle no-op separation | E2E compares persisted archive state across repeated archive and audit counts across repeated archive/restore; service execution proves repeated restore performs one total save/audit. | ✅ COMPLIANT |
| Migration, authorization, and contract proof | Collision-safe migration | Live PostgreSQL rollback restores `units_code_key`; actionable normalized collision diagnostics occur before index creation; reapplication restores the normalized index. | ✅ COMPLIANT |

**Compliance summary**: 20/20 scenarios compliant; 8/8 requirements have complete static and passing runtime evidence.

### Correctness by Requirement

| Requirement | Status | Notes |
|---|---|---|
| Safe resident reads and validation | ✅ Implemented | Safe mapper, normalized search, archive visibility, non-empty PATCH, and stable pages are executed. |
| Resident identity and active-unit invariant | ✅ Implemented | PostgreSQL uniqueness and both lock races are executed. |
| Resident archive lifecycle | ✅ Implemented | Transition, no-op, inactive restore, missing identity, audits, and rollback are executed. |
| Resident migration/auth/error/contract proof | ✅ Implemented | Live migration rollback/preflight and complete resident error paths pass. |
| Safe unit reads and validation | ✅ Implemented | Safe projection, archive filtering, empty PATCH, and stable pages pass. |
| Unit uniqueness and independent activation | ✅ Implemented | Concurrent uniqueness and active/historical resident semantics pass. |
| Unit archive lifecycle and dependencies | ✅ Implemented | Reservation, dependency classes, transitions, no-ops, and audits pass. |
| Unit migration/auth/contract proof | ✅ Implemented | Migration, bearer/ADMIN/OpenAPI/error contracts pass. |

### Design Coherence

| Decision | Followed? | Notes |
|---|---|---|
| Canonical writes and normalized PostgreSQL expression indexes | ✅ Yes | Live concurrency and archived reservation proof pass. |
| Aggregate-owned reversible migrations | ✅ Yes | Four Phase 2 down migrations, collision preflights, and reapplication execute live. |
| Explicit allowlist mappers | ✅ Yes | Production responses and DTO tests exclude password, role, linked identity, and archive actor data. |
| Archive metadata independent from activation | ✅ Yes | Unit activation is preserved; resident restore persists both identities inactive. |
| Deterministic unit-first locks | ✅ Yes | Assignment/reactivation races preserve the invariant. |
| Only named identity `23505` maps to conflict | ⚠️ Deviation | Both services currently classify any nested driver `23505` as their public identity conflict rather than checking the named index. No required scenario fails. |
| HTTP/OpenAPI production proof | ✅ Yes | Nine unmocked production-stack tests and the generated artifact cover the required contract. |

### TDD Compliance

| Check | Result | Details |
|---|---|---|
| TDD evidence reported | ✅ | Apply-progress records safety-net, RED, GREEN, triangulation, and rollback evidence for tasks 1.1-6.2 and bounded remediations. |
| All tasks have tests | ✅ | 12/12 checked task rows identify extant tests. |
| RED confirmed | ⚠️ | Test files and recorded failing observations exist; historical revisions cannot be replayed from current bytes. |
| GREEN confirmed | ✅ | Full suite 163/163, focused acceptance 9/9, and focused coverage suite 74/74 pass freshly. |
| Triangulation adequate | ✅ | The final nine-test E2E slice closes archived identity, resident list/page, restore, no-op, audit, and error-envelope gaps. |
| Safety net for modified files | ⚠️ | Historical baseline runs are detailed, but fresh verification independently confirms only current GREEN. |

**TDD compliance**: 4/6 fully confirmed and 2/6 partially confirmable from current bytes.

### Test Layer Distribution

| Layer | Tests | Files | Evidence |
|---|---:|---:|---|
| Unit/contract/fake-QueryRunner | 74 | 11 | Focused Strict-TDD coverage command; all passed. |
| PostgreSQL integration | 26 | 2 | Metadata 16 and session-foundation 10, included in the full suite. |
| Production Nest HTTP/TypeORM/PostgreSQL E2E | 9 | 1 | Resident/unit services are unmocked. |
| **Directly reviewed related tests** | **109** | **14** | All passed in fresh execution. |

### Changed File Coverage

| Changed production file/group | Line % | Branch % | Uncovered lines | Rating |
|---|---:|---:|---|---|
| `src/common/non-empty-patch.pipe.ts` | 100 | 100 | None | ✅ Excellent |
| `src/common/http/http-error.contract.ts` | 28.57 | 0 | 56-77 | ⚠️ Low |
| `src/config/database.config.ts` | 0 | 0 | 1-4 | ⚠️ Low |
| Four Phase 2 migrations | 100 | 100 | None | ✅ Excellent |
| `src/residents/resident.dto.ts` | 100 | 80 | Branches 46-63 | ✅ Excellent |
| `src/residents/residents.service.ts` | 91.39 | 73.14 | 103, 106, 136, 184, 193, 219, 226, 254-258, 261, 311-315, 318 | ⚠️ Acceptable |
| `src/residents/residents.controller.ts` | 0 | 0 | 1-106 | ⚠️ Low in unit coverage; executed separately by E2E |
| `src/units/unit.dto.ts` | 100 | 100 | None | ✅ Excellent |
| `src/units/units.service.ts` | 91.56 | 70.68 | 41, 49, 75, 87-90, 143 | ⚠️ Acceptable |
| `src/units/units.controller.ts` | 0 | 0 | 1-106 | ⚠️ Low in unit coverage; executed separately by E2E |

**Selected-source coverage**: 26.65% lines. No project coverage threshold was identified. This focused Jest report does not merge separately passing E2E coverage.

### Assertion Quality

**Assertion quality**: ✅ No tautologies, ghost loops, smoke-only checks, or tests that avoid production code were found. The final acceptance tests assert HTTP results plus persisted PostgreSQL state and audit effects.

### Quality Metrics

**Scoped linter**: ❌ 567 errors and 34 warnings across the 15 changed TypeScript files; non-blocking under the Strict-TDD verification rules.
**Type checker/build**: ✅ Passed.
**Coverage**: ⚠️ Informational gaps described above.
**OpenAPI freshness**: ✅ Passed.

### Issues Found

**CRITICAL (0)**: None.

**WARNING (4)**:

1. Scoped ESLint exits 1 with 567 errors and 34 warnings, dominated by existing/current formatting and unsafe test-typing findings.
2. Both identity services map every nested driver `23505` to the public email/code conflict instead of checking the named normalized index, contrary to the design decision.
3. Focused unit coverage does not merge E2E controller/filter execution and leaves several changed files below 80% in that report.
4. Historical RED and safety-net runs are recorded but cannot be independently replayed from the final repository bytes.

**SUGGESTION (2)**:

1. Type the E2E response helpers and format the acceptance file so the behaviorally strong production-stack suite also passes scoped lint.
2. Merge E2E coverage with unit coverage and directly assert the `message` field in the endpoint-level error helper, even though the generic Phase 0 contract and OpenAPI schema already cover it.

### Cleanup and Rollback Safety

The real PostgreSQL acceptance setup reverted all four Phase 2 migrations, verified archive columns absent and raw uniqueness constraints restored, exercised collision preflight before normalized-index creation, and reapplied the migrations. Forced archive and restore audit failures rolled back resource state and audit counts. Final Docker inspection found zero matching proof containers and zero matching volumes.

### Severity Counts

| Severity | Count |
|---|---:|
| CRITICAL | 0 |
| WARNING | 4 |
| SUGGESTION | 2 |

### Verdict

**PASS WITH WARNINGS**

All 8 requirements and all 20 scenarios have passing executable coverage, including nine unmocked PostgreSQL production-stack acceptance tests. Every required command passed, cleanup is complete, and no critical finding remains.
