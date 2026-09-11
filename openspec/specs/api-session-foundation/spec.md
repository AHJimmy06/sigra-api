# API Session Foundation Specification

## Purpose

Define revocable-session persistence/cryptography. Excluded: endpoints/controllers; cookie/CSRF/Origin enforcement; lifecycle orchestration; audit/OpenAPI; reset/outbox/SMTP; cleanup scheduling; Web/Mobile.

## Requirements

### Requirement: Session and refresh-operation persistence

Sessions MUST persist identity, user, current digest/version, generation, derivation-key version, 30-day absolute expiry, revocation, and timestamps. Operations MUST retain session-scoped identifier, presented digest/version, resulting generation/key versions, expiry, and timestamp through parent-session expiry.

#### Scenario: Persist reconciliation facts
- GIVEN secret-free session/operation facts
- WHEN persisted in one transaction
- THEN reconciliation facts remain queryable through session expiry

### Requirement: Caller-owned transactions and locking

Mutation and locking MUST use the caller's manager, MUST NOT create transactions, and MUST lock a selected session until that transaction ends.

#### Scenario: Concurrent mutation lock
- GIVEN concurrent transactions target a session
- WHEN the first locks through its manager
- THEN the second cannot mutate stale state; rollback leaves no partial update

### Requirement: Digest lookup and reconciliation classification

Lookup MUST distinguish current and retained superseded-predecessor digests. Operation identifiers MUST be session-unique. For the same session/identifier, matching recorded predecessor facts MUST be idempotent retry; matching issued successor facts MUST be idempotent reconciliation returning that successor without rotation. Any unrelated/mismatched session, predecessor, successor, digest, or generation MUST conflict before mutation. A superseded predecessor with another identifier MUST be strict no-grace reuse reported to lifecycle for revocation.

#### Scenario: Same-operation predecessor retry
- GIVEN a retained operation's session/identifier/predecessor facts match
- WHEN retried with that predecessor
- THEN persisted successor facts return without rotation/mutation

#### Scenario: Same-operation successor reconciliation
- GIVEN a retained operation's session/identifier/issued-successor facts match
- WHEN retried with that successor
- THEN identical successor facts return without rotation/mutation

#### Scenario: Same-operation conflict
- GIVEN an identifier has unrelated/mismatched session/predecessor/successor/digest/generation facts
- WHEN reconciliation is attempted
- THEN it conflicts before mutation

#### Scenario: Distinct-operation reuse
- GIVEN a retained superseded predecessor
- WHEN another identifier presents it
- THEN lookup reports strict no-grace reuse—not current/retry/reconciliation—to lifecycle for revocation

### Requirement: Revocation and bounded cleanup

The foundation MUST provide idempotent single-session and user-wide revocation in caller-owned transactions. Cleanup MUST accept a cutoff and positive batch bound, delete deterministically, and preserve unexpired retention obligations.

#### Scenario: User-wide revocation
- GIVEN target-user and other-user sessions
- WHEN target-user revocation repeats in a caller-owned transaction
- THEN only target-user sessions become revoked idempotently

#### Scenario: Safe bounded purge
- GIVEN eligible and retention-protected records exceed a batch bound
- WHEN cleanup runs
- THEN only the bounded eligible set is deleted deterministically

### Requirement: Versioned and separated keyrings

Digests MUST use dedicated versioned HMAC-SHA256 keys. Refresh and CSRF derivation MUST use a separate versioned HKDF-SHA256 keyring, with distinct session-and-generation labels. Startup MUST reject malformed, duplicate, missing-active, undersized, or production-default keys; retained references MUST remain resolvable.

#### Scenario: Keyring validation and separation
- GIVEN valid active and retained versions
- WHEN each domain processes one session-generation input
- THEN outputs are deterministic/versioned/distinct, and referenced versions remain required

#### Scenario: Invalid keyring
- GIVEN malformed/duplicate/undersized/default/missing-active keys
- WHEN startup validates configuration
- THEN startup fails before serving requests

### Requirement: Migration, index parity, and rollback

A reversible migration MUST match table, key, uniqueness, nullability, and type metadata. Indexes MUST support current-digest uniqueness, user revocation, both cleanup paths, session-operation uniqueness, and presented-digest lookup. Rollback MUST preserve pre-existing schema.

#### Scenario: Forward and reverse parity
- GIVEN a clean supported database
- WHEN migration, parity check, and reversal execute
- THEN forward metadata/indexes match; reversal adds nothing

### Requirement: Secret prohibition, compatibility, and TDD

Repositories and storage MUST NOT contain raw refresh, CSRF, access-token, or password material. Existing bearer/role behavior MUST remain compatible. Delivery MUST follow strict RED-GREEN-REFACTOR, with failing tests before production changes.

#### Scenario: Boundary verification
- GIVEN storage inspection and existing bearer tests
- WHEN foundation and compatibility suites execute
- THEN no raw secret appears, prior behavior passes, and each behavior has RED-before-GREEN evidence
