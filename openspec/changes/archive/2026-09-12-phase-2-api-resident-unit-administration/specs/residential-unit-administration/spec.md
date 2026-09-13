# Residential Unit Administration Specification

## Purpose

Define the ADMIN-only unit contract for safe reads, mutations, activation, and reversible archival.

## Requirements

### Requirement: Safe unit reads and validation

The system MUST expose ADMIN-only `GET /api/units/:id` and paginated collections. Archived units MUST be hidden (404 for default detail) unless `includeArchived=true`. Responses MUST be allowlisted projections without resident user data; lists MUST order by `createdAt DESC, id DESC`. PATCH MUST reject an empty body, and code, address, and search inputs MUST be trimmed; code uniqueness MUST be case-insensitive.

#### Scenario: Detail and archive filter

- GIVEN an ADMIN requests a unit or lists units
- WHEN the request is valid with or without `includeArchived=true`
- THEN the response contains the safe projection and only the permitted archive visibility

#### Scenario: Empty PATCH and stable page

- GIVEN an ADMIN submits `{}` or requests a filtered page
- WHEN validation or pagination runs
- THEN `{}` receives the Phase 0 validation envelope and results retain the deterministic tie-breaker

### Requirement: Normalized unit uniqueness and independent activation

Unit code uniqueness MUST use a normalized PostgreSQL value and become a public conflict under concurrent writes. `active` MUST remain an independent boolean wire field, MUST NOT represent archive state, and MUST NOT become an enum. Ordered transactional locks MUST preserve assignment invariants; deactivation MUST be rejected only while ACTIVE residents are linked.

#### Scenario: Normalized code collision

- GIVEN existing or concurrent codes differ only by case or boundary whitespace
- WHEN a create or update persists
- THEN normalized duplicates are rejected with a deterministic conflict

#### Scenario: Active resident blocks deactivation

- GIVEN an ACTIVE resident references the unit
- WHEN ADMIN deactivates the unit
- THEN the operation is rejected and the unit remains unchanged

#### Scenario: Historical resident does not block deactivation

- GIVEN only inactive or archived resident rows reference the unit
- WHEN ADMIN deactivates the unit
- THEN the operation preserves the boolean `active` contract and completes without archive semantics

### Requirement: Reversible unit archive lifecycle and dependency protection

The system MUST provide ADMIN-only archive and restore endpoints returning HTTP 200 with the safe resource. Archive MUST be reversible, separate from boolean `active`, audited as `UNIT_ARCHIVED`, and rejected when ANY dependency exists, including inactive/historical residents and retained passes, tickets, or access/history references. Restore MUST clear archive metadata, preserve `active` without toggling it, and audit `UNIT_RESTORED`; repeated commands MUST be successful no-ops without audits. Unit code MUST remain reserved while archived.

#### Scenario: Archive and restore independent state

- GIVEN a unit has no resident dependency
- WHEN ADMIN archives, then restores it
- THEN the code remains reserved, archive visibility changes, `active` is not implicitly redefined, and transitions are audited atomically

#### Scenario: Any dependency blocks archive

- GIVEN any resident row references the unit
- WHEN ADMIN archives the unit
- THEN the request returns a Phase 0 conflict, makes no state or audit change, and preserves all history

#### Scenario: Archive lifecycle no-op separation

- GIVEN a unit is already archived or is not archived
- WHEN ADMIN repeats archive or restore, respectively
- THEN the request succeeds without an audit event, and the repeated command does not perform activation or deactivation

### Requirement: Migration, authorization, and contract proof

The normalized uniqueness migration MUST preflight legacy collisions before index creation with actionable diagnostics and have a verified down path. Routes MUST require bearer authentication and `ADMIN`, use Phase 0 errors, and have OpenAPI/acceptance proof for filters, no-ops, dependencies, pagination, auditing, and no secrets or roles.

#### Scenario: Collision-safe migration

- GIVEN legacy unit rows contain normalized-equivalent codes
- WHEN the migration runs
- THEN it fails without partial schema enforcement and reports the colliding values for remediation
