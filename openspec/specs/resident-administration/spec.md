# Resident Administration Specification

## Purpose

Define the ADMIN-only resident contract for safe reads, mutations, activation, and reversible archival.

## Requirements

### Requirement: Safe resident reads and validation

ADMIN-only `GET /api/residents/:id` and paginated collections MUST be exposed. Archived residents MUST be hidden (404 for default detail) unless `includeArchived=true`; archived detail MAY be returned. Responses MUST be allowlisted without roles, hashes, or passwords. Pagination MUST order by `createdAt DESC, id DESC`. PATCH MUST reject an empty body; email inputs/searches MUST be trimmed and lowercased.

#### Scenario: Detail and filtered list

- GIVEN an ADMIN requests an active resident or the collection without `includeArchived`
- WHEN the request is valid
- THEN it returns the safe resident contract with deterministic pagination

#### Scenario: Archived visibility and empty patch

- GIVEN a resident is archived
- WHEN an ADMIN omits `includeArchived` or submits `{}` to PATCH
- THEN the resident is hidden or the PATCH receives the Phase 0 validation error envelope

### Requirement: Normalized identity and active-unit invariant

Resident email uniqueness MUST use a normalized value under concurrent writes, with conflicts as Phase 0 conflicts. Archived residents MUST reserve their normalized email, so identities cannot collide. Create, assignment, and reactivation MUST require an active unit. Unit locks MUST preserve this invariant.

#### Scenario: Concurrent normalized collision

- GIVEN two requests use emails differing only by case or boundary whitespace
- WHEN both attempt persistence
- THEN at most one succeeds and the other receives a deterministic conflict

#### Scenario: Unit deactivation race

- GIVEN resident assignment/reactivation and unit deactivation overlap
- WHEN transactions commit
- THEN either the resident change or deactivation fails, and the invariant remains true

#### Scenario: Archived email remains reserved

- GIVEN an archived resident owns normalized email `person@example.com`
- WHEN another resident is created or updated with an equivalent email
- THEN the write receives a conflict, including while the original resident remains archived

### Requirement: Reversible resident archive lifecycle

The system MUST provide ADMIN-only archive and restore endpoints returning HTTP 200 resources. Archive MUST atomically set metadata, deactivate resident and linked user, preserve history, and audit `RESIDENT_ARCHIVED`. Restore MUST require an active unit and intact identity, clear metadata, preserve `active=false` until separately activated, and audit `RESIDENT_RESTORED`; `active` MUST remain an independent boolean wire field, not an enum or alias. Repeated commands MUST be successful no-ops without audits.

#### Scenario: Archive and restore

- GIVEN an active resident has an intact linked user and active unit
- WHEN ADMIN archives, then restores the resident
- THEN both return the safe resource, linked access is disabled while archived, and each transition is audited transactionally

#### Scenario: Restore conflict

- GIVEN the assigned unit is inactive or the linked identity is missing/conflicting
- WHEN ADMIN restores the archived resident
- THEN the transaction rolls back and returns a Phase 0 conflict/error response

#### Scenario: Restore does not activate

- GIVEN an archived resident has an active assigned unit and intact linked identity
- WHEN ADMIN restores the resident
- THEN archive metadata is cleared, the resident and linked user remain inactive, and a separate activation request is required

#### Scenario: Archive lifecycle no-op separation

- GIVEN a resident is already archived or is not archived
- WHEN ADMIN repeats archive or restore, respectively
- THEN the request succeeds without an audit event, and the repeated command does not perform activation or deactivation

### Requirement: Migration, authorization, errors, and contract proof

The normalized resident-email uniqueness migration MUST preflight legacy collisions with actionable diagnostics before index creation and MUST have a verified reversible down path. Resident routes MUST require bearer authentication and `ADMIN`; unauthenticated and forbidden requests MUST use Phase 0 errors. Missing resources MUST be 404 and conflicts 409. OpenAPI and acceptance tests MUST prove filters, lifecycle responses, normalization, pagination, audit atomicity, and no role/secret fields.

#### Scenario: Collision-safe resident-email migration

- GIVEN legacy resident identities contain normalized-equivalent email values
- WHEN the resident-email uniqueness migration runs
- THEN it fails with actionable collision diagnostics before index creation
- AND its down path is verified to restore the prior uniqueness constraint

#### Scenario: Non-admin and malformed requests

- GIVEN an unauthenticated, non-ADMIN, or invalid request
- WHEN it calls any resident route
- THEN it receives the defined 401, 403, or 400 Phase 0 envelope without persistence
