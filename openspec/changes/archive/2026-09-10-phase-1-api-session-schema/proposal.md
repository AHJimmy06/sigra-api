# Proposal: Phase 1 API Session Schema

## Intent

Establish the physical PostgreSQL schema required to retain secret-free API-session reconciliation facts and prove migration forward-and-reverse parity.

## Scope

### In Scope

- Persist the secret-free session and refresh-operation reconciliation facts required by R1.
- Define the physical tables, constraints, foreign keys, uniqueness rules, and indexes required for durable reconciliation retention.
- Prove that the handwritten migration and TypeORM metadata remain equivalent in both forward and reverse directions under R6.

### Out of Scope

- Repository APIs, transactions, locking, lookup classification, rotation, retry, reconciliation, reuse handling, revocation, or cleanup behavior.
- Keyring parsing, digest or derivation implementation, readiness, HTTP endpoints, cookies, CSRF, Origin enforcement, audit, OpenAPI, reset, outbox, SMTP, Web, and Mobile.
- Any parent-change implementation work or product-code changes in this handoff.

## Capability

### New Capability

- `api-session-schema`: Physical storage and reversible-migration parity for API-session reconciliation facts.

## Approach

Add normalized `auth_sessions` and `refresh_operations` tables containing only reconciliation facts, versions, expiry, revocation, and timestamps. Preserve the parent-defined DDL contract exactly; do not add runtime ownership or security behavior. Use RED-GREEN-REFACTOR tests to prove metadata/index equivalence and migration reversal before implementing the schema in this child change.

## Risks

| Risk | Mitigation |
|---|---|
| Entity and migration definitions diverge | Assert forward metadata/index parity and run migration reversal against a supported clean database. |
| A persisted column retains raw secret material | Restrict stored fields to digests, identifiers, versions, generations, expiry, revocation, and timestamps. |

## Rollback

Revert this child change's schema entities, migration registration, migration, and parity tests together. Reverse the migration by dropping refresh operations before sessions; no runtime consumers are introduced by this handoff.
