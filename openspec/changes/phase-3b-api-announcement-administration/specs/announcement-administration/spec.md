# Delta for Announcement Administration

## MODIFIED Requirements

### Requirement: ADMIN announcement administration

List, detail, create, strict PATCH, and `POST /api/announcements/:id/archive` MUST require ADMIN. Responses MUST be allowlisted snapshot projections. Archives are terminal/read-only, default lists exclude them, explicit archived reads are permitted, and archived detail GET returns the safe nine-key ISO-date payload.

#### Scenario: Archived detail

- GIVEN an archived announcement
- WHEN an ADMIN calls GET by UUID
- THEN the response is the exact safe snapshot payload with ISO dates.

### Requirement: Transactional lifecycle

Create/content/lifecycle mutations MUST use transaction-bound audits. Existing rows MUST be pessimistically locked. Unchanged content, repeated target-state publication/withdrawal, and repeated archive MUST not save, change timestamps, or add audits.

#### Scenario: Concurrent lifecycle

- GIVEN concurrent lifecycle requests for one announcement
- WHEN PostgreSQL serializes the lock contention
- THEN only valid transitions and their single audit events persist.

## ADDED Requirement: Phase 3B delivery evidence

The change MUST preserve Phase 3A ownership and exclude 3C, 3D, and 3E. The original 1,050–1,400-line forecast is historical; final observed size is 2,120 changed lines (1,975 additions + 145 deletions), with pair totals 702, 387, 155, and 1,080. Delivery is one maintainer-approved `size:exception` PR under `exception-ok`.

#### Scenario: Scope isolation

- GIVEN the final Phase 3B range
- WHEN its path inventory is inspected
- THEN exactly 19 scoped paths are present and no Phase 3A schema/entity/migration, 3C, 3D, or 3E path appears.
