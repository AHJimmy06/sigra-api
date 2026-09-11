# Design: Phase 1 API Session Foundation

Non-implementing API-only umbrella; no direct apply work. Schema precedes primitives; endpoints, lifecycle, cookies/CSRF/Origin, reset/outbox/SMTP, Web, and Mobile remain excluded.

## Technical Approach

Schema exclusively supplies physical persistence parity (160–240 lines). Primitives delivers runtime behavior, configuration, Nest readiness, and RED-GREEN-REFACTOR tests (220–320). Split at 400 lines; the feature-branch chain targets `develop`.

## Exclusive Ownership and Traceability

| Parent requirement and scenarios | Authoritative child |
|---|---|
| 1. Session and refresh-operation persistence — Persist reconciliation facts | schema |
| 2. Caller-owned transactions and locking — Concurrent mutation lock | primitives |
| 3. Digest lookup and reconciliation classification — Same-operation predecessor retry; Same-operation successor reconciliation; Same-operation conflict; Distinct-operation reuse | primitives |
| 4. Revocation and bounded cleanup — User-wide revocation; Safe bounded purge | primitives |
| 5. Versioned and separated keyrings — Keyring validation and separation; Invalid keyring | primitives |
| 6. Migration, index parity, and rollback — Forward and reverse parity | schema |
| 7. Secret prohibition, compatibility, and TDD — Boundary verification | primitives |

Schema owns only physical DDL/parity; it exposes no runtime behavior.

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Persistence | Two normalized tables; no raw secrets. | Indexed reconciliation and locking need durable facts. |
| Transactions | Caller `EntityManager`; repositories open none. | Preserves atomic lifecycle composition. |
| Crypto | Dedicated versioned HMAC-SHA-256 and HKDF-SHA-256. | Existing keys remain separate domains. |
| Delivery | Schema then primitives; parent prohibited. | Respects the 400-line guard. |

## Data Flow and Runtime Contracts

    caller transaction + locked session
      -> operation classification -> rotate | retry | reconcile | conflict | reuse | invalid
      -> conflict-safe operation insert -> session mutation -> commit

With the session locked, precedence is: (1) look up `(session_id, operation_id)`; a matching recorded predecessor is `retry`, while matching already-issued successor facts are `reconcile`, both returning stored facts without rotation or mutation; **any** same-operation mismatch of session, predecessor, successor, digest, or generation is `conflict` before mutation. (2) With no operation, a matching current digest is a rotate candidate. (3) A matching superseded predecessor under a different operation is strict no-grace `reuse`, reported for lifecycle revocation. (4) Otherwise it is `invalid`.

Rotation inserts operation facts using `INSERT ... ON CONFLICT DO NOTHING` on `(session_id, operation_id)`. A zero-row insert re-reads under lock and repeats step 1; it never continues after an aborted unique-violation transaction.

Both keyrings parse comma-separated `version:base64urlKey`; versions retain `^[A-Za-z0-9._-]{1,32}$`, are unique, active/resolvable, non-default in production, and decode to at least 32 bytes. HKDF-SHA-256 uses empty salt, 32-byte output, domain only `refresh` or `csrf`, and UTF-8 info exactly `sigra:v1:<domain>:<uuid-lowercase>:<generation-decimal>`. HMAC input is UTF-8 exactly `sigra:v1:digest:<version>:<credential-base64url-unpadded>`. UUIDs, decimal generations, versions, and base64url encodings are canonical; malformed or out-of-domain inputs are rejected.

After `DataSource` initialization, a Nest bootstrap/readiness provider queries distinct `auth_sessions` digest/derivation versions and `refresh_operations` presented/result digest and result derivation versions. Readiness fails if any referenced version is absent from its configured keyring.

## Schema, Cleanup, and Parity

`auth_sessions`: UUID PK; cascading `user_id`; `current_refresh_digest bytea NOT NULL UNIQUE CHECK (octet_length(current_refresh_digest)=32)`; non-negative generation; `varchar(32) NOT NULL` versions with the C-collated ASCII check; `timestamptz` absolute/revoked/created/updated fields, with database-created non-null timestamps defaulting to `now()`. `refresh_operations`: UUID PK; cascading session FK; UUID operation ID; `presented_digest bytea NOT NULL CHECK (octet_length(presented_digest)=32)`; the same three version columns/check; non-negative result generation; `timestamptz` expiry/created fields; `UNIQUE(session_id, operation_id)`. Preserve current-digest, user-revocation, `(absolute_expires_at, id)`, operation-uniqueness, presented-digest, and `(expires_at, id)` indexes. Entities, handwritten up/down migration, datasource list, and metadata tests match every type, nullability, default, check, FK, uniqueness, and index; down drops operations then sessions.

Cleanup rejects non-positive limits. In one caller transaction, a CTE selects a positive limited, `(expires_at, id)` operation batch or `(absolute_expires_at, id)` session batch with `FOR UPDATE SKIP LOCKED`; `DELETE` joins only those IDs. Operation predicate: `o.expires_at <= :cutoff AND (s.id IS NULL OR s.absolute_expires_at <= :cutoff)`; after both expiries no live reconciliation requirement remains by definition. Session predicate: `s.absolute_expires_at <= :cutoff AND (s.revoked_at IS NOT NULL OR s.absolute_expires_at <= :cutoff)`. Delete selected eligible operations first; delete a session only after children are gone (or cascade only when every child meets the operation predicate). Concurrent cleaners skip locked rows and rerun safely.

## File Changes

| Files | Action | Child |
|---|---|---|
| `src/auth/**/*.entity.ts`, `src/migrations/*session*`, `src/config/typeorm.datasource.ts`, `src/config/typeorm-metadata.spec.ts` | Create/modify | schema |
| `src/auth/session-foundation/**`, `src/auth/auth.module.ts`, `src/config/env.validation.ts` | Create/modify | primitives |

## Testing Strategy

Schema RED tests cover DDL/metadata/index parity and forward/reverse migration. Primitives RED tests cover locking, classifier/re-read, cleanup, key encoding, readiness, secret inspection, and bearer compatibility.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

Deploy keyrings, schema, then primitives. Roll back consumers first, retain live references through expiry, then reverse schema.

## Open Questions

None.
