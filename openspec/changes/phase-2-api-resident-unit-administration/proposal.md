# Proposal: Phase 2 API Resident and Residential-Unit Administration

## Intent

Complete ADMIN-only resident and unit administration from baseline `cd5394380b9b7bd8063da3e5c76bdbf93cbbaf70` with safe reads, normalized identities, race-safe invariants, and archival distinct from activation.

## Scope

### In Scope
- Add safe detail reads, normalized uniqueness, non-empty PATCH validation, and stable pagination.
- Archive/restore residents transactionally with audits. Archive deactivates resident and linked user; restore requires an active assigned unit and intact linked identity. Archived email remains reserved.
- Archive/restore units transactionally with audits. Reject archival when any dependency exists. Archived code remains reserved.
- Hide archives by default, provide an archive filter, and preserve independent `active: boolean` semantics.
- Add migrations, lock-safe invariants, OpenAPI, and acceptance coverage.

### Out of Scope
- Web, Mobile, password recovery, SMTP/outbox, session transport, announcements, tickets, and access workflows except dependency/history evidence.
- Physical deletion, identity reuse, or equating `active=false` with archived.

## Capabilities

### New Capabilities
- `resident-administration`: Resident reads, mutations, activation, archival, identity integrity, invariants, and auditing.
- `residential-unit-administration`: Unit reads, mutations, activation, archival, dependency protection, uniqueness, and auditing.

### Modified Capabilities
None.

## Approach

Normalize input and enforce email/code uniqueness in PostgreSQL after collision preflight. Use explicit mappers and the Phase 0 error envelope. Lock units deterministically in lifecycle transactions. Deliver a feature-branch chain: contract/detail reads; unit hardening; resident hardening; unit archive; resident archive; acceptance/OpenAPI. Keep tests with each unit and target under 400 changed lines; use the approved exception only for an irreducible slice.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/residents/*` | Modified | Resident contracts, lifecycle, invariants, tests |
| `src/units/*` | Modified | Unit contracts, lifecycle, dependencies, tests |
| `src/common/{pagination.dto.ts,http/*}` | Modified | Filters, validation, public errors |
| `src/migrations/*`, `src/config/typeorm.datasource.ts` | New/Modified | Archive and uniqueness schema |
| `src/openapi/*`, `docs/openapi/v1.json` | Modified | Public contract and leak checks |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Normalized collisions block migration | Medium | Preflight with actionable diagnostics |
| Lifecycle races violate invariants or deadlock | Medium | Ordered locks and PostgreSQL tests |
| Archive changes leak secrets or break history | Low | Explicit projections and dependency/acceptance matrix |

## Rollback Plan

Disable archive writes while retaining the restore mechanism; restore archived records; revert application slices in reverse order; then run down migrations in reverse and restore prior uniqueness constraints. Preserve history and canonicalized email/code values throughout.

## Dependencies

- PostgreSQL; existing ADMIN guards, audit service, and Phase 0 error envelope.

## Success Criteria

- [ ] ADMIN contracts pass detail, filter, normalization, empty-PATCH, conflict, authorization, projection, and OpenAPI tests.
- [ ] Archive/restore, reserved identities, audits, and active-unit concurrency rules pass PostgreSQL tests.
- [ ] Migration up/down and normalized-collision preflight are verified.
