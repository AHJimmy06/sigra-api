# Exploration: Phase 2 API Resident and Residential-Unit Administration

**Baseline:** clean `develop` commit `cd5394380b9b7bd8063da3e5c76bdbf93cbbaf70` in the dedicated worktree. No evidence was taken from the separate `/home/jimmy/UTA/PFWYM/sigra-api` checkout.

## Executive Summary

The baseline already provides ADMIN-only create, paginated search/filter lists, PATCH updates, boolean activation controls, transactional audit writes, active-unit checks, and Phase 0 validation/error infrastructure. It does not provide detail reads or a distinct archive model, accepts empty PATCH bodies, only enforces exact unit-code uniqueness, and has race windows around the active-unit assignment invariant. Existing tests are service-focused and do not form an HTTP acceptance matrix for these resources.

Proposal work is blocked until the two archival policy decisions below are made. Local code, migrations, tests, and contracts are sufficient; no external research lane is needed.

## Current State

### HTTP contract and authorization

- `GET /api/residents` and `GET /api/units` support `page`, `pageSize`, `search`, and `status`; residents additionally support `unitId`.
- Lists return `{ items, total, page, pageSize }` and use deterministic `createdAt DESC, id DESC` ordering.
- `POST`, `PATCH :id`, and `DELETE :id` exist for both resources. There is no `GET :id` detail operation.
- Both controllers are guarded by bearer authentication and `Role.ADMIN`.
- Global validation transforms query values, whitelists DTO properties, and rejects non-whitelisted fields. Consequently, caller-supplied `role` and undeclared password/hash fields are rejected rather than persisted.
- The Phase 0 error envelope is globally enforced as `{ code, message, details, requestId }`. Resource messages already allowlist current not-found and conflict cases.
- The public resident DTOs expose email but not `passwordHash` or role. Unit DTOs expose no user data. The checked-in OpenAPI test explicitly rejects internal entity/secret schemas.
- Boolean `active` is the established request/response wire field. No evidence mandates renaming it; preserve it without an alias.

### Resident behavior

- Creation trims/lowercases email, requires an existing active unit, hashes the password with bcrypt cost 12, hard-codes `Role.RESIDENT`, creates resident and user in one transaction, and writes `RESIDENT_CREATED` audit data.
- List search covers resident name/phone, user email, and unit code; filtering covers boolean status and unit UUID.
- PATCH permits `name`, `phone`, `unitId`, and `active`. Assignment to an explicitly supplied unit requires that unit to be active. Changing `active` updates both resident and linked user in the same transaction and audits `RESIDENT_ACTIVATED` or `RESIDENT_REVOKED`.
- DELETE is not deletion: it delegates to `active: false` and returns 204. The row, user, passes, tickets, and historical references remain.
- Bearer requests reload an active user on every request, so linked-user deactivation blocks subsequent authenticated requests even though session transport is outside this change.

### Unit behavior

- Creation enforces an exact database-unique `code` and audits `UNIT_CREATED` in the transaction.
- List search covers code and address; status filtering uses the boolean `active` field.
- PATCH permits code, address, parking spaces, and active. Deactivation is rejected while active residents are linked and audits update/activate/deactivate actions.
- DELETE delegates to deactivation and returns 204; it is not archival or physical deletion.
- Parking-space bounds are validated at the DTO and database levels (`0..1000`).

### Persistence and history

- `residents.unit_id` is non-null and `ON DELETE RESTRICT`.
- `users.resident_id` is nullable and `ON DELETE SET NULL`; `auth_sessions.user_id` is `ON DELETE CASCADE`.
- Resident passes are `ON DELETE CASCADE`, maintenance tickets are `ON DELETE RESTRICT`, and access events retain nullable resident/unit/pass snapshots. Physical resident deletion would therefore either destroy pass history or fail on ticket history.
- Audit logs retain actor/resource UUID values without foreign keys. Current state changes are audited transactionally, but no archive/restore actions exist.

## Exact Gaps

| Concern | Baseline evidence | Gap required for Phase 2 |
|---|---|---|
| Detail reads | Collection GET only | Add ADMIN `GET /residents/:id` and `GET /units/:id`, explicit DTOs, 404 behavior, and OpenAPI coverage. |
| Stable pagination | Both lists order by `createdAt DESC, id DESC` | Preserve the tie-breaker and add tests proving filters/search do not remove it. Offset pagination remains stable only relative to an unchanged dataset. |
| Field normalization | Resident email is trim/lowercase on create | Unit code is exact/case-sensitive and untrimmed; names, addresses, phones, codes, and search text accept boundary whitespace. Define canonical input normalization without changing boolean compatibility. |
| Normalized uniqueness | `users.email` and `units.code` are plain unique columns | Add database-backed normalized uniqueness, including concurrent-write conflict translation and a migration preflight for legacy normalized collisions. |
| Active-unit assignment | Create checks inside its transaction; PATCH checks a supplied unit before its transaction | Reactivating a resident without `unitId` does not verify the current unit. Checks and writes do not lock consistently, so resident activation/assignment can race unit deactivation. |
| Empty PATCH | Every update field is optional | `{}` is accepted, persisted, timestamped, and audited as an update. Reject it through a reusable DTO/body contract and test the Phase 0 validation envelope. |
| Resident response mapping | List selects only user email; create returns resident plus email | No single detail mapper exists. Update omits email, create may omit the loaded unit, and reassignment can return a stale eager relation. Explicit projection/mapping is needed for every response path. |
| Secret/role boundary | DTO whitelist rejects undeclared fields; resident output never spreads `User` | Add HTTP regression tests for create/PATCH attempts containing `role`, `passwordHash`, or undeclared password fields and inspect every detail/list response. |
| Audit semantics | Create/update/toggle operations write audit events transactionally | Same-state toggles still emit activation/revocation with `from === to`; archive/restore semantics are undefined. Define whether no-op state requests are rejected or idempotent and how they are audited. |
| Archival | DELETE means revoke/deactivate | There is no archive timestamp/state, archive filtering, restore rule, dependency policy, or archive audit action. |
| Acceptance coverage | Unit service: 3 tests; resident service: 4 tests; resident phone DTO: 2 parameterized groups; Phase 0 envelope has separate contract tests | No resident/unit controller E2E suite, detail tests, empty-PATCH tests, normalized-collision migration tests, race/invariant tests, or full response leak matrix. |

## Affected Areas

- `src/residents/residents.controller.ts` — add detail/archive lifecycle routes only after policy selection; retain ADMIN guards.
- `src/residents/residents.service.ts` — consolidate public mapping, transactional locking/invariant checks, normalized conflicts, detail reads, state and archive audit.
- `src/residents/resident.dto.ts` — normalized field validation, non-empty PATCH, and one explicit non-secret detail/update contract.
- `src/residents/resident.entity.ts` — archive metadata only if a distinct resident archive option is selected.
- `src/residents/residents.service.spec.ts` and a new resident HTTP acceptance spec — close service, authorization, envelope, invariant, audit, and leak gaps.
- `src/units/units.controller.ts` — add detail/archive lifecycle routes after policy selection.
- `src/units/units.service.ts` — normalized code conflict handling, locking, detail reads, and selected dependency policy.
- `src/units/unit.dto.ts` — normalized validation and non-empty PATCH contract.
- `src/units/unit.entity.ts` — normalized uniqueness/archive metadata as selected.
- `src/units/units.service.spec.ts` and a new unit HTTP acceptance spec — cover list stability, detail, validation, conflicts, dependencies, and audit.
- `src/common/pagination.dto.ts` — normalize bounded search text while preserving `status=true|false` compatibility.
- `src/common/http/http-error.contract.ts` — allowlist only newly approved public conflict/not-found messages.
- `src/migrations/` and `src/config/typeorm.datasource.ts` — register reversible normalized-uniqueness and optional archival schema changes, with parity/rollback tests.
- `src/openapi/openapi-artifact.spec.ts` and `docs/openapi/v1.json` — document detail/lifecycle contracts and verify no secret or role exposure.
- `src/access/access-pass.entity.ts`, `src/tickets/ticket.entity.ts`, `src/auth/auth-session.entity.ts` — dependency evidence only; their workflows remain out of scope.

## Approaches

### Recommended non-archival implementation approach

1. **Explicit application normalization plus database enforcement** — normalize DTO/query boundaries, preserve display-safe values where needed, and enforce normalized email/code uniqueness with named database indexes.
   - Pros: deterministic API behavior, race-safe conflicts, and consistent search/validation.
   - Cons: migration must detect pre-existing normalized collisions before index creation; functional indexes require metadata/migration parity decisions.
   - Effort: Medium.

2. **Transactionally lock the unit invariant** — perform create, reassignment, activation, and unit deactivation checks through the transaction manager and lock the affected unit rows in a consistent order.
   - Pros: closes the check/write race without relying on service timing; keeps the invariant near current services.
   - Cons: requires PostgreSQL integration tests and careful lock ordering; ORM-only unit mocks cannot prove concurrency.
   - Effort: Medium.

3. **One explicit public projection per aggregate** — detail/list/create/update all return mapped response objects rather than entity spreads or raw-row positional assumptions.
   - Pros: prevents password/hash/role leaks, fixes missing/stale unit/email fields, and gives OpenAPI one stable contract.
   - Cons: small mapping layer and broader response tests are required.
   - Effort: Low.

## BLOCKING BEFORE PROPOSAL

No archival option is selected here. The proposal must record the user's choice and its consequences.

### Decision 1: Resident archival

1. **Distinct reversible archive**
   - Model: add `archivedAt`; archive atomically marks the resident archived/inactive, disables the linked user, and audits `RESIDENT_ARCHIVED`; restore is a separate audited command.
   - Restore constraints: the assigned unit must still be active, normalized identity conflicts must be resolved, and the linked user relationship must still be valid.
   - Query consequence: normal lists/details must define whether archived rows are hidden by default and how ADMIN explicitly includes them; `active` remains independent and wire-compatible.
   - Uniqueness consequence: either archived identities continue reserving email (safest historical identity) or a partial unique rule permits reuse and restore can conflict. This must be stated in the proposal.
   - History consequence: resident, user link, passes, tickets, access snapshots, and audit identity remain intact.
   - Complexity: High; requires migration, lifecycle endpoints, filters, restore conflicts, and audit tests.

2. **Distinct terminal archive**
   - Model: add immutable `archivedAt`; archive atomically disables resident/user and audits `RESIDENT_ARCHIVED`; no restore endpoint exists.
   - Query consequence: archived rows are excluded from operational lists but remain available through an explicit administrative historical contract if required.
   - Uniqueness consequence: retaining email reservation prevents identity ambiguity; releasing it needs partial uniqueness and accepts that a later account can reuse historical identity data.
   - History consequence: all rows and historical references remain, but accidental archival requires an exceptional data-repair process rather than an API action.
   - Complexity: Medium to High; less lifecycle code than reversible archive, but still needs schema, filters, and terminal-state enforcement.

3. **Revoke-only / no separate archive**
   - Model: retain current `active: false` behavior and treat DELETE as reversible access revocation only; add no archive state or restore endpoint.
   - Query consequence: `status=false` includes every revoked/retired resident with no distinction.
   - Uniqueness consequence: email remains reserved by the retained user row.
   - History consequence: all current references remain safe; the product cannot distinguish temporary revocation from administrative retirement.
   - Complexity: Low; no archival migration, but the proposal must explicitly say resident archival is unsupported.

### Decision 2: Unit archival with dependencies

1. **Reject when any dependency exists**
   - Model: a distinct archive command is allowed only when no resident row references the unit; use transactional locking and audit `UNIT_ARCHIVED`.
   - Consequence: strongest historical conservatism and simplest invariant, but units with even revoked/historical residents can never be archived through the API.
   - Restore/query consequence: requires archive metadata/filtering and a defined restore command if archival is reversible.
   - Complexity: Medium.

2. **Controlled active-resident reassignment, then archive**
   - Model: one command supplies an active target unit, locks source/target and affected residents, reassigns active residents, archives/deactivates the source, and records aggregate audit metadata atomically.
   - Consequence: supports operational retirement without downtime, but inactive historical residents may remain linked to the archived source unless the proposal explicitly migrates them too. Either rule must be visible in detail/history responses.
   - Failure consequence: invalid/inactive target, target equal to source, concurrent resident changes, or any reassignment failure rolls back the entire command.
   - Complexity: High; requires concurrency, rollback, bulk audit, and historical-reference tests and may need its own review slice.

3. **Deactivate-only / no archive**
   - Model: retain current `active: false` behavior; reject while active residents are linked and keep DELETE as deactivation.
   - Consequence: no schema change and all historical references remain, but temporary unavailability and permanent retirement are indistinguishable.
   - Query consequence: `status=false` remains the only lifecycle filter; no archive/restore contract exists.
   - Complexity: Low; the proposal must explicitly state unit archival is unsupported.

## Reviewable Delivery Slices

These are cohesive forecast boundaries, not measured implementation diffs. `sdd-tasks` must estimate authored additions plus deletions against the 400-line budget and split once honestly if a slice exceeds it.

| Chain slice | Deliverable behavior and verification | Forecast |
|---|---|---|
| 1. Contract and detail reads | Explicit safe mappers; resident/unit `GET :id`; DTO/OpenAPI/404 tests; unchanged ADMIN/Phase 0 contracts | 250–360 lines, likely under 400 |
| 2. Unit hardening | Canonical code validation; normalized unique migration/index; empty PATCH; lock-safe activation/deactivation; focused service/PostgreSQL tests | 300–390 lines, budget-sensitive |
| 3. Resident hardening | Canonical inputs; active-unit validation for create/reassign/reactivate; lock-safe invariant; empty PATCH; linked-user/audit/leak tests | 330–400 lines, high budget risk; split normalization from invariant only if measured overage is honest |
| 4. Archival lifecycle | Only the selected resident/unit policies, migration, query semantics, dependency handling, audit, rollback tests | Unknown until decisions; likely over 400 if both aggregates are distinct archives, so use separate resident and unit child slices |
| 5. Acceptance matrix | HTTP ADMIN/401/403, pagination/search/filter stability, validation/conflicts, boolean compatibility, no-secret/no-role assertions, OpenAPI artifact | 250–380 lines, likely under 400 |

For the feature-branch chain, each child should target its immediate predecessor and carry its focused test command, runtime/PostgreSQL scenario (or explicit N/A), and rollback boundary. The `exception-ok` strategy permits an honest exception when a proof-bearing slice cannot be reduced below 400, but does not replace the initial slicing pass.

## Recommendation

Proceed to proposal only after both archival decisions are supplied. Independently of those choices, retain the `active` boolean wire field, add explicit detail projections, reject empty PATCH requests, enforce normalized uniqueness in PostgreSQL as well as application code, and serialize all sides of the active-unit invariant through transaction-manager locking. Keep archive semantics separate from activation semantics if either distinct archive option is chosen.

## Risks

- Normalized unique index creation can fail if deployed data contains case/whitespace-equivalent emails or unit codes; migration must detect and report collisions before enforcing the index.
- Inconsistent lock ordering between resident and unit mutations can replace the current race with deadlocks; source/target unit locks need a deterministic order.
- Offset pagination is deterministically ordered but cannot guarantee snapshot consistency while rows are concurrently inserted or changed.
- Reusing archived email/code values can make restoration conflict and historical identity ambiguous; retaining them can block legitimate reuse.
- Distinct archival spans dependency and session-adjacent data even though those workflows are excluded; implementation must preserve references without expanding into their feature behavior.
- Baseline tests could not be executed in this worktree because dependencies are not installed (`jest: not found`); findings are based on indexed and direct source/test inspection.

## Ready for Proposal

**No.** The orchestrator should ask the user to select one resident archival option and one unit archival-with-dependencies option. No external research is necessary. After those answers, proposal/spec/design can define lifecycle endpoints, uniqueness retention, archive visibility, audit/no-op semantics, and the final chain forecast without guessing policy.
