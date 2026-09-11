# Apply Progress: Phase 1 API Session Primitives

## Work Unit 1: Crypto, Configuration, and Readiness

**Status**: Complete

Tasks 1.1–1.4 are complete. This record closes the already-implemented strict-TDD work unit after independent rerun of the required acceptance commands.

### TDD Cycle Evidence

The preceding strict-TDD worker reported genuine RED-before-GREEN evidence for this candidate. The RED executions are historical evidence: they cannot be rerun against the completed implementation without reverting it. The GREEN results below were independently rerun for settlement.

| Task | Test file | Layer | Safety net | RED | GREEN | Triangulate | Refactor |
|---|---|---|---|---|---|---|---|
| 1.1 | `keyrings.spec.ts`, `env.validation.spec.ts` | Unit | Existing environment validation passed before the new keyring assertions. | ✅ Previous worker wrote and ran failing vector, canonical-rejection, separation, and configuration tests before production code. | ✅ Current focused rerun: 4 suites, 10 tests passed. | ✅ HMAC vector/unresolved credential plus refresh/CSRF domain-distinct derivation and separated-config cases. | ✅ No behavior-changing refactor required; current rerun remains green. |
| 1.2 | `keyrings.spec.ts` | Unit | N/A for new keyring files. | ✅ Previous worker wrote and ran failing versioned HMAC/HKDF contract tests before implementation. | ✅ Current focused rerun: 4 suites, 10 tests passed. | ✅ Active-version vector, retained lookup failure, malformed credential, undersized key, and cross-keyring substitution paths. | ✅ Immutable map and canonical-input implementation retained; current rerun remains green. |
| 1.3 | `session-key-readiness.spec.ts`, `postgres.spec.ts` | Unit + PostgreSQL runtime | N/A for new readiness files. | ✅ Previous worker wrote and ran failing five-column resolution and unresolved-version tests before implementation. | ✅ Current focused rerun: 4 suites, 10 tests passed; PostgreSQL rerun: 1 suite, 1 test passed. | ✅ Successful five-column resolution and unresolved `auth_sessions.current_digest_key_version` failure paths. | ✅ Query helper retained without behavior change; current reruns remain green. |
| 1.4 | `session-key-readiness.spec.ts`, `env.validation.spec.ts` | Unit + module wiring | Existing module/config tests passed before provider and validation wiring. | ✅ Previous worker wrote and ran failing readiness/config/provider contract tests before wiring. | ✅ Current focused rerun: 4 suites, 10 tests passed; build and lint passed. | ✅ Valid independent rings and rejected cross-domain reuse; digest and derivation provenance remain distinct. | ✅ No behavior-changing refactor required; build and lint remain green. |

### Test Summary

- **Current focused result**: `npm test -- --runInBand auth/session-foundation env.validation` — exit 0; 4 suites passed, 10 tests passed.
- **Current PostgreSQL result**: `npm test -- --runInBand auth/session-foundation/postgres.spec.ts` — exit 0; 1 suite passed, 1 test passed.
- **Current build result**: `npm run build` — exit 0.
- **Current lint result**: `npm run lint` — exit 0.
- **Layers used**: Unit and PostgreSQL runtime integration.
- **Approval tests**: None — the work unit adds new behavior rather than refactoring existing behavior.
- **Pure functions created**: Keyring parsing, digesting, and derivation behavior is deterministic; readiness is an in-process startup boundary.

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command | `npm test -- --runInBand auth/session-foundation env.validation` — exit 0; 4 suites passed, 10 tests passed, 0 failed. |
| Runtime harness command and scenario | `npm test -- --runInBand auth/session-foundation/postgres.spec.ts` — exit 0; 1 suite passed, 1 test passed. The harness initialized PostgreSQL and verified all five persisted version columns resolve only through their separated keyrings. |
| Build | `npm run build` — exit 0. |
| Lint | `npm run lint` — exit 0. |
| Rollback boundary | Remove `src/auth/session-foundation/{digest-keyring,derivation-keyring,session-key-readiness}.ts` and their tests, then revert session-keyring validation and providers in `src/config/env.validation.ts`, `src/config/env.validation.spec.ts`, and `src/auth/auth.module.ts`. This removes only crypto/config/readiness behavior; canonical schema entities and rows remain. |

### Delivery and Settlement

- **Delivery strategy**: `exception-ok`; the maintainer authorized size exceptions for all slices.
- **Chain strategy**: `feature-branch-chain`.
- **Current boundary**: Work Unit 1 only — crypto, configuration, readiness, focused tests, and PostgreSQL readiness proof. Repositories, classification, revocation, cleanup, endpoints, and E2E compatibility remain out of scope.
- **Exact authored source diff**: 511 additions and 3 deletions, for **514 changed lines**. This count includes six new `session-foundation` files and changes to `auth.module.ts`, `env.validation.ts`, and `env.validation.spec.ts`; it excludes OpenSpec planning/progress artifacts.
- **Size exception rationale**: The unit cannot be divided without separating strict-TDD tests from the code and runtime proof they verify. The explicit maintainer exception permits the 514-line cohesive slice under the 900-line cap.
- **Candidate identity**: `sha256:84259526aa646ace5cbe3fa75e01663ea47bdeb7607c4b3a379e13ba3703beee`.
- **Settlement remediation target**: `sha256:9135e1cd3f73adfd92b67e290cbe7b76465258770c8da757b56fbf5afa12f3f0`.

### Remaining Tasks

- [x] 3.1–3.4 Revocation, cleanup, compatibility, and final verification (completed in Work Unit 3).

## Bounded Remediation: Verification FAIL Revision

**Status**: Complete — one bounded correction transaction against failed evidence revision `sha256:6a8c9857e14d49535cdb23cf21d3a5befe7fe084b0ebea4f92081a8a85fcf488`.

### Blocker Disposition

1. **Retained credential lookup and locked facade** — fixed. `SessionClassificationFacade` computes every retained digest candidate, resolves and locks the owning session through current or retained-operation digest ownership, then invokes locked classification without writes.
2. **Current/reuse precedence** — fixed. The classifier now evaluates current credentials before retained predecessor reuse.
3. **Retry/reconcile successor credentials** — fixed. Both non-mutating outcomes return the deterministic base64url successor credential reconstructed from persisted operation facts.
4. **Duplicate serialized key versions** — fixed. Environment validation detects duplicate JSON object keys before `JSON.parse` collapses them.
5. **Task 3.3 strict-TDD RED evidence** — fixed with new evidence only. An unknown-but-signed bearer subject initially received 200 from an inaccurate E2E repository double; the double now models the active-user lookup and the assertion proves 401 with no echoed credential. No historical evidence was changed or fabricated.

### TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | Triangulate | Refactor |
|---|---|---|---|---|---|---|---|
| 1.2 | `env.validation.spec.ts` | Unit | `npm test -- --runInBand config/env.validation.spec.ts` passed 3/3 before new assertion. | ✅ New duplicate serialized keyring assertion failed: expected `duplicate:keyring`, received no throw. | ✅ 4/4 after pre-parse duplicate detection. | ✅ Existing key-length and keyring-separation cases plus serialized duplicate input. | ✅ Scanner is limited to JSON object keys; formatter and final suite passed. |
| 2.2–2.3 | `classifier.spec.ts`, `session-classification-facade.spec.ts`, `postgres.spec.ts` | Unit + PostgreSQL runtime | `npm test -- --runInBand auth/session-foundation` passed 4 suites/16 tests before correction tests. | ✅ Classifier correction failed for missing retry credential; facade test failed because module was absent; PostgreSQL facade test then failed with `FOR UPDATE is not allowed with DISTINCT clause`. | ✅ Focused unit 3 suites/8 tests and PostgreSQL 1 suite/9 tests passed after implementation and lock-query refactor. | ✅ Retry, reconcile, current-vs-reuse overlap, retained v1/v2 lookup, and real no-write PostgreSQL retry coverage. | ✅ Replaced invalid `DISTINCT ... FOR UPDATE` with `EXISTS`, retaining one locked owner row. |
| 3.3 | `test/app.e2e-spec.ts` | E2E compatibility/security | `npm run test:e2e -- --runInBand app.e2e-spec.ts` passed 6/6 before the new assertion. | ✅ Real RED: signed unknown subject returned 200 instead of required 401. | ✅ 7/7 after the repository double correctly returns `null` for an unknown active-user lookup; response assertion confirms the credential is not echoed. | ✅ Existing missing/lowercase/expired/wrong-role/allowed-role paths remain covered. | ✅ No guard or endpoint behavior changed; only test boundary fidelity changed. |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command | `npm test -- --runInBand auth/session-foundation` — exit 0; 5 suites, 19 tests passed, 0 failed. |
| Runtime harness command and scenario | `SIGRA_POSTGRES_PASSWORD=schema-proof docker compose -p sigra-phase0-local -f compose.dev.yml up -d --wait postgres` — exit 0, PostgreSQL healthy. The retained v1 credential integration scenario resolved its owner through `refresh_operations`, acquired `FOR UPDATE`, returned the reconstructed successor, and preserved `current_generation`. |
| E2E compatibility | `npm run test:e2e` — exit 0; 3 suites, 16 tests passed, 0 failed. |
| Full unit suite | `npm test` — exit 0; 26 suites, 117 tests passed, 0 failed. |
| Build | `npm run build` — exit 0. |
| Lint | `npm run lint` — exit 0. |
| Rollback boundary | Revert `session-classification-facade.ts`, retained-candidate lookup and classifier return/precedence changes, serialized duplicate detection, and the accompanying unit/PostgreSQL/E2E tests. This removes only this remediation; schema, endpoints, cleanup, and prior passing behavior remain. |

### Settlement

- **Native token**: `sha256:8089d92595acef264fdb73824a2799fc6e8f2dce228605243c62d64100b5f498`.
- **Failed evidence remediated**: `sha256:6a8c9857e14d49535cdb23cf21d3a5befe7fe084b0ebea4f92081a8a85fcf488`.
- **Delivery**: maintainer-approved `size:exception`; bounded remediation cap 2200 lines. No commit, push, PR, schema, endpoint, or lifecycle scope added.

## Work Unit 3: Revocation, Cleanup, and Compatibility

**Status**: Complete

Tasks 3.1–3.4 are complete. The cleanup primitive remains manager-only and adds no endpoint or session lifecycle orchestration.

### TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | Triangulate | Refactor |
|---|---|---|---|---|---|---|---|
| 3.1 | `postgres.spec.ts` | PostgreSQL runtime | `npm test -- --runInBand auth/session-foundation` — 4 suites, 13 tests passed. | ✅ `npm test -- --runInBand auth/session-foundation/postgres.spec.ts` failed because `./cleanup` did not exist. | ✅ Focused PostgreSQL run — 1 suite, 8 tests passed. | ✅ Single and user-wide repeated revocation; non-positive bound rejection; operation-first ordered retention-safe batch; two concurrent transaction workers own disjoint `SKIP LOCKED` rows. | ✅ Extracted result-row normalization for TypeORM PostgreSQL mutation results; focused test remained green. |
| 3.2 | `postgres.spec.ts` | PostgreSQL runtime | N/A — new `cleanup.ts`. | ✅ Same missing-module RED from 3.1 specified the public cleanup contract before its implementation. | ✅ Focused PostgreSQL run — 1 suite, 8 tests passed. | ✅ Covers zero bound error, operations consuming the global limit before sessions, unexpired operation retention, and concurrent workers. | ✅ Parameterized CTEs retain a single global limit without behavior-changing cleanup. |
| 3.3 | `app.e2e-spec.ts` | E2E approval | `npm run test:e2e` — 3 suites, 14 tests passed. | ➖ Approval coverage: bearer/role behavior is intentionally unchanged, so the new case preserves the existing case-sensitive `Bearer` contract rather than requiring a product behavior change. | ✅ `npm run test:e2e -- app.e2e-spec.ts` — 1 suite, 6 tests passed. | ✅ Missing bearer, lowercase scheme, wrong role, expired bearer, and allowed admin bearer paths are covered. | ✅ No production auth guard change; no raw refresh/CSRF/access/key material is persisted by cleanup SQL or evidence. |
| 3.4 | `auth.module.spec.ts`, `app.e2e-spec.ts` | Unit + E2E | Session-foundation and E2E safety nets passed before integration. | ✅ `npm test -- --runInBand auth/auth.module.spec.ts` failed: `SessionCleanup` was absent from AuthModule providers. | ✅ Module test — 1 suite, 1 test passed; final acceptance commands passed. | ✅ Provider/export registration and unchanged bearer/role E2E paths exercise independent module and transport boundaries. | ✅ Typed reflected metadata as `unknown[]` to satisfy lint; final tests remained green. |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command | `npm test -- --runInBand auth/session-foundation` — exit 0; 4 suites passed, 16 tests passed, 0 failed. |
| Runtime harness command and scenario | `SIGRA_POSTGRES_PASSWORD=schema-proof docker compose -p sigra-phase0-local -f compose.dev.yml up -d --wait postgres` — PostgreSQL healthy; focused suite exit 0. Two independent PostgreSQL transactions concurrently purged four expired sessions and each deleted two disjoint rows via `FOR UPDATE SKIP LOCKED`. |
| E2E compatibility | `npm run test:e2e` — exit 0; 3 suites passed, 15 tests passed, 0 failed. |
| Full unit suite | `npm test` — exit 0; 25 suites passed, 113 tests passed, 0 failed. |
| Build | `npm run build` — exit 0. |
| Lint | `npm run lint` — exit 0. |
| Rollback boundary | Remove `src/auth/session-foundation/cleanup.ts`, its additions in `postgres.spec.ts`, `src/auth/auth.module.spec.ts`, the `SessionCleanup` provider/export in `src/auth/auth.module.ts`, and the lowercase-bearer approval case in `test/app.e2e-spec.ts`. This removes only cleanup/revocation integration and its proofs; schema, rows, keyrings, repositories, and bearer/role implementation remain. |

### Delivery

- **Delivery strategy**: maintainer-approved `size:exception` under the 1800-line cap.
- **Chain strategy**: `feature-branch-chain`; Work Unit 3 is the final child after crypto/config/readiness and repository/classification slices.
- **Authored Work Unit 3 diff**: 313 additions, 0 deletions (product code and tests; OpenSpec progress excluded).
- **Native candidate identity**: `sha256:b8b431735909baf426ecb4b41a6af7a75ef9b6686178e487da9fdc156086a59e`.
- **Evidence identity**: `sha256:d2ae93bf28fc8e254c18ccf4784f714a2582ce7693fee094bf1232a377271dbe` (runtime source/test diff at final verification).

### Remaining Tasks

None — 3.1–3.4 are checked in `tasks.md`; independent SDD verification is next.

## Work Unit 2: Repositories and Classification

**Status**: Complete — remediation added and ran the previously missing real PostgreSQL proofs. Tasks 2.1–2.4 are checked in `tasks.md`.

### TDD Cycle Evidence

| Task | Test file | Layer | Safety net | RED | GREEN | Triangulate | Refactor |
|---|---|---|---|---|---|---|---|
| 2.1 | `postgres.spec.ts` | PostgreSQL runtime | `npm test -- --runInBand auth/session-foundation` before remediation: 4 suites, 11 tests passed. | ✅ Genuine earlier RED: initial execution failed because `SessionPrimitiveRepository` did not exist. Remediation RED: the new database cross-session fixture failed with `TypeError: Cannot read properties of undefined (reading 'length')` in `classifier.ts`, exposing unmapped SQL rows. | ✅ Remediation focused run: 1 suite, 5 tests passed; final focused run: 4 suites, 13 tests passed. | ✅ Two distinct PostgreSQL transactions prove `FOR UPDATE` blocks; the first updates `current_generation`, rolls back, and the second observes persisted generation `0`. | ✅ SQL result aliases now return the entity property names required by classification. |
| 2.2 | `classifier.spec.ts` | Unit | N/A (new test and classifier files). | ✅ Initial execution failed because `SessionClassifier` did not exist. | ✅ Final focused run: 4 suites, 11 tests passed. | ✅ Covers retry, reconciliation, conflict, current, reuse, and invalid classifications. | ✅ Shared timing-safe digest comparison extracted. |
| 2.3 | `classifier.spec.ts`, `postgres.spec.ts` | Unit + PostgreSQL runtime | Existing session-foundation suite passed before changes. | ✅ Genuine earlier RED: tests imported absent classifier/repository contracts before implementation. Remediation RED is recorded under 2.1 because the database fixture exposed the repository row-mapping defect. | ✅ Final focused run: 4 suites, 13 tests passed. | ✅ Unit cases cover retry, reconciliation, conflict, current, reuse, invalid; PostgreSQL fixture proves cross-session data reaches `SESSION_MISMATCH`. | ✅ Query-result aliases preserve manager-only SQL and classifier contract. |
| 2.4 | `postgres.spec.ts` | PostgreSQL runtime | Existing PostgreSQL readiness boundary passed before modification. | ✅ Genuine earlier RED: `recordOrReclassify` test failed with `TypeError: repository.recordOrReclassify is not a function`. Remediation RED: persisted cross-session operation fixture failed before SQL aliases were added. | ✅ Final focused run: 4 suites, 13 tests passed. | ✅ Two real QueryRunners perform the same `(session_id, operation_id)` insert: writer two stays blocked, writer one commits, writer two gets `ON CONFLICT DO NOTHING`, locked re-reads, reclassifies `OPERATION_MISMATCH`, and the database contains exactly one row. | ✅ Re-read projection uses the same normalized operation shape as locked classification. |

### Work Unit Evidence

| Evidence | Exact result |
|---|---|
| Focused test command | `npm test -- --runInBand auth/session-foundation` — exit 0; 4 suites passed, 13 tests passed, 0 failed. |
| Runtime harness command and scenario | `SIGRA_POSTGRES_PASSWORD=schema-proof docker compose -p sigra-phase0-local -f compose.dev.yml up -d --wait postgres` — PostgreSQL healthy. `npm test -- --runInBand auth/session-foundation/postgres.spec.ts` — exit 0; 1 suite passed, 5 tests passed. It proves two-writer conflict-safe recording, persisted cross-session mismatch classification, and rollback after a real session-row mutation. The harness removes both fixture sessions, operations, and users in `afterAll`; it was run successfully immediately before final checks. |
| Build | `npm run build` — exit 0. |
| Lint | `npm run lint` — exit 0. |
| Rollback boundary | Remove `classifier.ts`, `types.ts`, `session.repository.ts`, `refresh-operation.repository.ts`, and their Phase 2 additions in `classifier.spec.ts` and `postgres.spec.ts`. This leaves Phase 1 keyring/readiness and the physical schema intact. |

### Delivery

- **Delivery strategy**: maintainer-approved `size:exception` under the 1400-line cap.
- **Chain strategy**: `feature-branch-chain`; this is Work Unit 2 only, intended as the child after Work Unit 1 and before cleanup/revocation compatibility work.
- **Native candidate identity**: `sha256:02ab1a932112a8d579a7b5f428ec36e6b8cbb50b729ed808d46f520a9d11c5ee`.
- **Passing settlement remediation revision**: `sha256:66aa250f6483cd81d76cb9ffecbca275d14050a2f463cffb0aa0982f25be1a51`.
- **Rollback boundary**: Revert Phase 2 aliases in `session.repository.ts` and `refresh-operation.repository.ts`, plus the Phase 2 PostgreSQL tests in `postgres.spec.ts`. This removes repository/classification runtime behavior and its proof only; Work Unit 1 keyrings/readiness, canonical schema entities, schema rows, and Phase 3 scope remain untouched.

### Remaining Tasks

- [x] 3.1–3.4 Revocation, cleanup, compatibility, and final verification (completed in Work Unit 3).
