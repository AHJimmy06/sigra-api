# API Session Schema Specification

## Purpose

Define secret-free schema, migration reversal, registration, and R1/R6 parity; runtime excluded.

## Requirements

### Requirement: Auth session table

`auth_sessions` MUST contain, in order: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`; `user_id uuid NOT NULL`; `current_refresh_digest bytea NOT NULL`; `current_digest_key_version varchar(32) NOT NULL`; `current_generation integer NOT NULL`; `current_derivation_key_version varchar(32) NOT NULL`; `absolute_expires_at timestamptz NOT NULL`; `revoked_at timestamptz NULL`; `created_at timestamptz NOT NULL DEFAULT now()`; `updated_at timestamptz NOT NULL DEFAULT now()`.

It MUST define `fk_auth_sessions_user` from `(user_id)` to `users(id) ON DELETE CASCADE`; checks `ck_auth_sessions_current_refresh_digest_length` as `octet_length(current_refresh_digest) = 32`, `ck_auth_sessions_current_generation_nonnegative` as `current_generation >= 0`, plus `ck_auth_sessions_current_digest_key_version_format` and `ck_auth_sessions_current_derivation_key_version_format`, each applying `COLLATE "C" ~ '^[A-Za-z0-9._-]{1,32}$'` to its named column. It MUST define unique index `uq_auth_sessions_current_refresh_digest(current_refresh_digest)` and ordered indexes `idx_auth_sessions_user_revocation(user_id, revoked_at, absolute_expires_at)` and `idx_auth_sessions_cleanup(absolute_expires_at, id)`.

#### Scenario: Exact session metadata
- GIVEN built entity metadata
- WHEN the `auth_sessions` contract is inspected
- THEN all ordered columns, types, lengths, nullability, primary generation, defaults, checks, foreign keys, delete actions, index order, and uniqueness MUST match exactly

### Requirement: Refresh operation table

`refresh_operations` MUST contain, in order: `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`; `session_id uuid NOT NULL`; `operation_id uuid NOT NULL`; `presented_digest bytea NOT NULL`; `presented_digest_key_version varchar(32) NOT NULL`; `result_generation integer NOT NULL`; `result_digest_key_version varchar(32) NOT NULL`; `result_derivation_key_version varchar(32) NOT NULL`; `expires_at timestamptz NOT NULL`; `created_at timestamptz NOT NULL DEFAULT now()`.

It MUST define `fk_refresh_operations_session` from `(session_id)` to `auth_sessions(id) ON DELETE CASCADE`; checks `ck_refresh_operations_presented_digest_length` as `octet_length(presented_digest) = 32`, `ck_refresh_operations_result_generation_nonnegative` as `result_generation >= 0`, plus `ck_refresh_operations_presented_digest_key_version_format`, `ck_refresh_operations_result_digest_key_version_format`, and `ck_refresh_operations_result_derivation_key_version_format`, each applying `COLLATE "C" ~ '^[A-Za-z0-9._-]{1,32}$'` to its named column. It MUST define unique index `uq_refresh_operations_session_operation(session_id, operation_id)` and ordered indexes `idx_refresh_operations_presented_digest(presented_digest)` and `idx_refresh_operations_cleanup(expires_at, id)`.

#### Scenario: Exact operation metadata
- GIVEN built entity metadata
- WHEN the `refresh_operations` contract is inspected
- THEN all ordered columns, constraints, foreign keys, delete actions, and indexes MUST match exactly

### Requirement: Reversible migration and registration

One registered migration MUST create `auth_sessions` before `refresh_operations`, then the named indexes. Captured SQL MUST prove order, stable object names, exact check/foreign-key/index clauses, single registration, and no broad `CASCADE`. Reversal MUST drop operations before sessions, add nothing, and prove pre/post equality for every migration-owned application-schema declaration and datum. `pg_extension` identity/version and `pg_depend` extension-dependency declarations MUST remain unchanged. Pre-existing extension-owned internals omitted by `pg_dump` are outside this child's ownership and proof boundary.

#### Scenario: Forward and reverse execution
- GIVEN a clean supported PostgreSQL database containing `users`
- WHEN the registered migration runs and reverts
- THEN forward schema satisfies both requirements; reversal proves exhaustive owned schema/data equality plus unchanged extension identity/version/dependency declarations
- AND omitted pre-existing extension-owned internals MUST NOT count as child-owned rollback proof

### Requirement: Exhaustive parity, prohibition, and RED evidence

Entity metadata and executed PostgreSQL catalog introspection MUST each exhaustively prove every declared column order/type/length/nullability/generation/default, check name/expression, foreign-key name/columns/target/delete action, and index name/order/uniqueness semantic. Captured SQL MUST prove migration-specific facts without reparsing catalog-proven semantics. Comparison MUST be non-lossy and MUST NOT erase casts, operator precedence, regex literals, or `COLLATE "C"` distinctions.

Neither table MUST contain raw refresh, CSRF, access-token, or password columns. Delivery MUST retain dated or committed RED-first evidence of exhaustive assertion failure on absent entities or migration before production changes, then success. This constrains owned R1/R6 without owning or substituting parent R7 runtime boundary verification. The forecast MUST remain 246–280 changed lines under the maintainer-approved `size:exception` ceiling of 1500 changed lines; the observed proof-bearing slice is 1471 source additions, 29 lines below that approved ceiling, and this atomic schema slice MUST remain unsplit.

#### Scenario: Drift or secret rejected
- GIVEN any parity mismatch, lossy comparison, omitted SQL proof, secret column, or missing RED evidence
- WHEN the schema suite evaluates owned R1/R6 parity and local acceptance evidence
- THEN the suite MUST fail with the differing contract element identified

#### Scenario: Complete parity accepted
- GIVEN exhaustive metadata/catalog parity, required SQL proof, bounded reversal proof, registration, and RED evidence
- WHEN the schema suite executes
- THEN every assertion MUST pass without claiming or exercising parent R7 runtime verification
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
