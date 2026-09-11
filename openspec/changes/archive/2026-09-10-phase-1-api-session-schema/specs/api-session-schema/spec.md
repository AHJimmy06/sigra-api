# API Session Schema Specification

## Purpose

Define only the physical schema handoff for R1 reconciliation-fact persistence and R6 forward-and-reverse migration parity. This change defines no runtime repository, lifecycle, cryptographic, transport, revocation, or cleanup behavior.

## ADDED Requirements

### Requirement: Persist reconciliation facts

The schema MUST persist only secret-free session and refresh-operation reconciliation facts. `auth_sessions` MUST retain a UUID identity, user reference, current refresh digest and digest version, generation, derivation-key version, absolute expiry, optional revocation timestamp, and timestamps. `refresh_operations` MUST retain a UUID identity, session reference, operation identifier, presented digest and version, resulting generation, result digest version, result derivation-key version, expiry, and timestamp. The schema MUST retain operation facts through the parent session's absolute expiry and MUST NOT persist raw refresh, CSRF, access-token, or password material.

#### Scenario: Persist reconciliation facts
- GIVEN secret-free session and refresh-operation facts
- WHEN the schema stores the facts in one transaction
- THEN the facts remain queryable through the parent session expiry without storing raw credential material

### Requirement: Forward and reverse parity

The handwritten migration and TypeORM metadata MUST agree on every API-session table, column type, nullability, default, check constraint, foreign key, uniqueness rule, and required index. The schema MUST include current-digest uniqueness, user-revocation, `(absolute_expires_at, id)`, session-operation uniqueness, presented-digest, and `(expires_at, id)` index support. The reverse migration MUST drop refresh operations before sessions and MUST leave no API-session schema objects after reversal.

#### Scenario: Forward and reverse parity
- GIVEN a clean supported database
- WHEN the API-session migration, metadata/index parity check, and reverse migration execute
- THEN the forward schema matches metadata and indexes, and reversal adds nothing
