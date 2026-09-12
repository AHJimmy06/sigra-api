# Tasks: Phase 2 Resident/Unit Administration

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Work Units

| Unit | Goal | PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Contracts (150) | 1, tracker→ | `npm test -- --runInBand residents units common` | `npm run build`; N/A HTTP | Read/contract files |
| 2 | Unit identity/locks (160) | 2, →PR1 | `npm test -- --runInBand units migrations` | PostgreSQL up/down | Unit migration/behavior |
| 3 | Resident identity/locks (160) | 3, →PR2 | `npm test -- --runInBand residents migrations` | PostgreSQL up/down | Resident/user migration/behavior |
| 4 | Unit archive (180) | 4, →PR3 | `npm test -- --runInBand units` | PostgreSQL dependencies | Unit archive migration/behavior |
| 5 | Resident archive (200) | 5, →PR4 | `npm test -- --runInBand residents` | PostgreSQL archive/restore | Resident archive migration/behavior |
| 6 | OpenAPI/acceptance (180) | 6, →PR5 | `npm test -- --runInBand test src/openapi` | `npm run openapi:check` + e2e | Acceptance/OpenAPI/docs |

## Phase 1: Contracts and Reads (PR 1)

- [x] 1.1 RED: test empty PATCH, trimming/normalization boundaries, ordering, boolean `active`, and safe projections in `src/residents/resident.dto.spec.ts`, `src/units/unit.dto.spec.ts`, `src/common/pagination.dto.spec.ts`.
- [x] 1.2 GREEN: update `src/residents/resident.dto.ts`, `src/units/unit.dto.ts`, `src/common/pagination.dto.ts`, `src/residents/residents.controller.ts`, `src/units/units.controller.ts`, `src/residents/residents.service.ts`, and `src/units/units.service.ts` for baseline reads; evidence: `npm test -- --runInBand residents units common` and `npm run build` pass; rollback contract/read files.

## Phase 2: Unit Identity and Invariants (PR 2)

- [x] 2.1 RED: test normalized collisions, deactivation, concurrency, lock order in `src/units/units.service.spec.ts`, `src/migrations/1724600005000-HardenUnitIdentity.spec.ts`.
- [x] 2.2 GREEN: create `src/migrations/1724600005000-HardenUnitIdentity.ts`; update `src/units/unit.entity.ts`, `src/units/units.service.ts`, `src/config/typeorm.datasource.ts`; evidence: tests/up-down pass; revert these before resident migration.

## Phase 3: Resident Identity and Invariants (PR 3)

- [x] 3.1 RED: test normalized email collision/reservation, active-unit requirements, and create/reassign/reactivate races in `src/residents/residents.service.spec.ts`, `src/migrations/1724600006000-HardenResidentIdentity.spec.ts`.
- [x] 3.2 GREEN: create `src/migrations/1724600006000-HardenResidentIdentity.ts`; update `src/users/user.entity.ts`, `src/residents/residents.service.ts`, `src/config/typeorm.datasource.ts`; evidence: preflight/up/down pass; revert before PR 2 migration.

## Phase 4: Unit Archive Lifecycle (PR 4)

- [x] 4.1 RED: test archive visibility/filter, dependencies, `active`, reserved code, audit, no-op, and restore in `src/units/units.service.spec.ts`, `src/migrations/1724600007000-AddUnitArchiveMetadata.spec.ts`.
- [x] 4.2 GREEN: create `src/migrations/1724600007000-AddUnitArchiveMetadata.ts`; update `src/units/unit.entity.ts`, `src/units/units.service.ts`, `src/units/units.controller.ts`, `src/config/typeorm.datasource.ts` for archive metadata and visibility; evidence: `npm test -- --runInBand units` and PostgreSQL migration checks pass; disable writes, restore records, revert app/migration.

## Phase 5: Resident Archive Lifecycle (PR 5)

- [ ] 5.1 RED: test archive visibility/filter, archive/restore, linked-user disable, restore active-unit/identity preconditions, `active`, reserved email, audit, and no-op in `src/residents/residents.service.spec.ts`, `src/migrations/1724600008000-AddResidentArchiveMetadata.spec.ts`.
- [ ] 5.2 GREEN: create `src/migrations/1724600008000-AddResidentArchiveMetadata.ts`; update `src/residents/resident.entity.ts`, `src/residents/residents.service.ts`, `src/residents/residents.controller.ts`, `src/config/typeorm.datasource.ts` for archive metadata, visibility, and linked-user lifecycle; evidence: `npm test -- --runInBand residents` and PostgreSQL migration checks pass; disable writes, restore residents, revert before unit migrations.

## Phase 6: Acceptance and Public Contract (PR 6)

- [ ] 6.1 RED: test ADMIN/errors, filters, pagination, lifecycle, dependencies, audits, leaks in `test/resident-unit-administration.e2e-spec.ts`, `src/openapi/openapi-artifact.spec.ts`.
- [ ] 6.2 GREEN: update `src/common/http/http-error.contract.ts`, `docs/openapi/v1.json`, `src/openapi/openapi-artifact.spec.ts`, `test/resident-unit-administration.e2e-spec.ts`; evidence: `npm test -- --runInBand`, `npm run build`, `npm run openapi:check`, `npm run test:e2e` pass; retain restore capability.
