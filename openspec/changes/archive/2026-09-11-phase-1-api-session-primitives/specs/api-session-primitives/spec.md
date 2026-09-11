# API Session Primitives Specification

## Purpose

Define runtime session primitives without owning lifecycle or physical schema.

## Requirements

### Requirement: Caller-owned transactions and locking

Persistence MUST use the caller-supplied manager and transaction, MUST NOT create transactions, and MUST hold a real lock until completion.

#### Scenario: Concurrent mutation lock
- GIVEN concurrent real transactions target one session through distinct managers
- WHEN the second attempts mutation while the first holds the lock
- THEN the second MUST wait and re-evaluate after release
- AND rollback MUST leave no session or operation mutation

### Requirement: Digest lookup and reconciliation classification

Under lock, precedence MUST be: recorded predecessor retry; deterministic successor reconciliation; same-operation mismatch conflict; otherwise current digest current, retained predecessor under a distinct operation strict no-grace reuse, else invalid. Retry, reconciliation, and conflict MUST precede mutation. Conflict-safe recording that records nothing MUST trigger locked re-read and reclassification, not rotation.

#### Scenario: Same-operation predecessor retry
- GIVEN retained operation and predecessor facts match
- WHEN that predecessor is presented again
- THEN the recorded successor MUST return without rotation or mutation

#### Scenario: Same-operation successor reconciliation
- GIVEN retained operation and deterministically derived successor facts match
- WHEN that successor is presented
- THEN recorded successor facts MUST return without rotation or mutation

#### Scenario: Same-operation conflict
- GIVEN an identifier has any mismatched session, predecessor, successor, digest, version, or generation fact
- WHEN classification or a recording race is resolved
- THEN conflict MUST return after locked re-read and before mutation

#### Scenario: Distinct-operation reuse
- GIVEN a retained predecessor belongs to another operation identifier
- WHEN it is presented with a distinct identifier
- THEN strict no-grace reuse MUST be reported, never another classification

### Requirement: Revocation and bounded cleanup

Single-session and user-wide revocation MUST be transactionally idempotent. Purge MUST reject non-positive bounds, deterministically bound eligibility at a cutoff, delete operations before sessions, preserve unexpired evidence, and prevent concurrent duplicate ownership.

#### Scenario: User-wide revocation
- GIVEN target and other users have active and revoked sessions
- WHEN single-session and target-user revocations are repeated
- THEN only selected or target-user sessions MUST become revoked idempotently

#### Scenario: Safe bounded purge
- GIVEN eligible, worker-locked, and protected records exceed a positive bound
- WHEN concurrent workers purge at one cutoff
- THEN each MUST delete only its bounded eligible set, operations first
- AND protected or worker-owned records MUST remain

### Requirement: Versioned and separated keyrings

Refresh digests MUST use an independent versioned HMAC-SHA256 keyring; refresh/CSRF derivation MUST use a separate versioned HKDF-SHA256 keyring. Canonical digest input MUST separate version and unpadded base64url credential; derivation input MUST separate domain, lowercase UUID, and decimal generation. Active/retained versions MUST resolve independently. Readiness MUST inspect every persisted key-version reference and fail if unresolved.

#### Scenario: Keyring validation and separation
- GIVEN independent keyrings contain every active/persisted version
- WHEN canonical inputs are digested, derived, and readiness-checked
- THEN outputs MUST be deterministic, versioned, domain-distinct, and resolvable

#### Scenario: Invalid keyring
- GIVEN malformed/non-canonical entries, duplicates, undersized keys, defaults, missing active versions, cross-keyring substitution, or unresolved persisted references
- WHEN configuration or readiness is evaluated
- THEN startup MUST fail before serving and identify the invalid class

### Requirement: Secret prohibition, compatibility, and TDD

Persistence and evidence MUST NOT contain raw refresh, CSRF, access-token, password, or key material. Bearer and role behavior MUST remain unchanged. Delivery MUST retain strict RED-before-GREEN runtime evidence, require predecessor schema source in the actual base, and make an honest child-specific size decision; predecessor exceptions MUST NOT transfer.

#### Scenario: Boundary verification
- GIVEN the actual base, secret inspection, RED evidence, and bearer/role suites
- WHEN acceptance checks locking, rollback, races, cleanup, readiness, unit, E2E, build, and lint
- THEN secrets MUST remain absent and bearer/role behavior MUST pass unchanged
- AND apply MUST remain blocked without schema-source proof or an approved child-specific size decision
