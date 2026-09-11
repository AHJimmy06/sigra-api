# Design: Phase 1 API Session Primitives

## Technical Approach

Implement stateless, manager-only primitives over canonical entities. They own R2–R5/R7 (10 scenarios), not schema, lifecycle, transport, scheduling, or DDL. `AuditService.record(manager, ...)` is the local precedent.

## Architecture Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Transactions | Caller `EntityManager`; no transaction creation. | Lifecycle atomicity. |
| Lookup/classification | Retained-version HMAC candidates, then `FOR UPDATE` on the resolved session. | Version-aware serialization. |
| Successor | `base64url(HKDF(resultDerivationKeyVersion, refresh, sessionId, resultGeneration))`, then HMAC with `resultDigestKeyVersion`; never persist it. | Archived columns retain deterministic facts, not secrets. |
| Cleanup | One global deletion bound; operations consume it before sessions. | Unambiguous batch/concurrency behavior. |
| Keyrings | Independent immutable HMAC/HKDF maps and provenance queries. | No cross-domain substitution. |

## Data Flow

    credential -> digest candidates -> current/operation lookup -> locked session
       -> classifyLocked -> return/no write | record operation -> caller mutation

`findByPresentedCredential(manager, credential)` computes candidates for every retained HMAC version and queries current and retained digests, then locks the owner. A resolved owner other than `facts.sessionId`, or a same-operation row outside the locked/claimed session, is `conflict`; no cross-session row is adopted.

```ts
type DigestFact = { digest: Buffer; digestKeyVersion: string };
type SuccessorFacts = { generation: number; digestKeyVersion: string; derivationKeyVersion: string };
type OperationFacts = { sessionId: string; operationId: string; presented: DigestFact; successor: SuccessorFacts; expiresAt: Date };
type Classification =
 | { kind: 'retry'|'reconcile'; operation: RefreshOperation; successor: SuccessorFacts; credential: string }
 | { kind: 'current'; session: AuthSession }
 | { kind: 'reuse'; session: AuthSession; operation: RefreshOperation }
 | { kind: 'conflict'; code: 'SESSION_MISMATCH'|'OPERATION_MISMATCH'|'SUCCESSOR_MISMATCH' }
 | { kind: 'invalid' };
class SessionPrimitiveRepository {
  classifyLocked(manager: EntityManager, locked: AuthSession, facts: OperationFacts): Promise<Classification>;
}
```

`classifyLocked` requires `locked.id === facts.sessionId` and reads `(session_id, operation_id)`. Order: matching `presented` is `retry`; otherwise derive the canonical successor above, recompute its HMAC, and match result generation/digest/derivation versions plus supplied successor facts for `reconcile`; any same-operation mismatch is `conflict`; matching current is `current`; retained predecessor under another operation is `reuse`; else `invalid`. Only `current` may `recordOrRead` and mutate. All other outcomes mutate neither table. `INSERT ... ON CONFLICT DO NOTHING` returning zero re-reads under lock and runs only retry/reconcile/conflict.

## Cleanup, Crypto, and Readiness

`purge(manager, cutoff, limit)` rejects non-integer `limit <= 0` and returns `PurgeCount = { operations; sessions; total }`, with `total = operations + sessions <= limit`. It locks/deletes up to `limit` operations, ordered `(expires_at,id)`, with `FOR UPDATE SKIP LOCKED`: `o.expires_at <= $1 AND (s.id IS NULL OR s.absolute_expires_at <= $1)`. It then uses `limit - operations` for sessions ordered `(absolute_expires_at,id)`, requiring expiry and `NOT EXISTS` child operations. Competing workers own disjoint locked rows; skipped rows await another invocation. `revoke*` uses `COALESCE(revoked_at,$at)`.

HMAC input is UTF-8 `sigra:v1:digest:<version>:<credential-base64url-unpadded>`; HKDF-SHA-256 uses empty salt, 32 bytes, and `sigra:v1:<refresh|csrf>:<uuid-lowercase>:<generation-decimal>`. Validate canonical version/base64url, uniqueness, >=32 bytes, active resolvability, production defaults, and ring separation; errors identify `format`, `duplicate`, `key-length`, `active-version`, `default`, or `keyring-separation`.

After `DataSource` initialization, readiness separately queries distinct values from `auth_sessions.current_digest_key_version` and `refresh_operations.presented_digest_key_version,result_digest_key_version` against HMAC only; it queries `auth_sessions.current_derivation_key_version` and `refresh_operations.result_derivation_key_version` against HKDF only. Startup fails before serving with `unresolved-persisted-version:<column>:<version>`.

## File Changes

| File | Action | Description |
|---|---|---|
| `src/auth/session-foundation/{types,classifier,session.repository,refresh-operation.repository,cleanup}.ts` | Create | Contracts, locks, classifier, cleanup. |
| `src/auth/session-foundation/{digest-keyring,derivation-keyring,session-key-readiness}.ts` | Create | Separated crypto and readiness. |
| `src/auth/session-foundation/**/*.spec.ts` | Create | Unit and PostgreSQL proof. |
| `src/auth/auth.module.ts`, `src/config/env.validation.ts`, `src/config/env.validation.spec.ts`, `test/app.e2e-spec.ts` | Modify | Wiring, validation, compatibility only. |

## Testing Strategy

| Requirements / scenarios | RED evidence |
|---|---|
| R2: concurrent lock | Two PostgreSQL runners block, re-evaluate, rollback. |
| R3: retry; reconciliation; conflict; reuse | Lookup, cross-session conflict, precedence/no-write, reconstruction, re-read. |
| R4: revocation; bounded purge | Idempotence, global bound, ordering, retention, concurrent `SKIP LOCKED`. |
| R5: separation; invalid keyring | Vectors, errors, five-column provenance, startup failure. |
| R7: boundary verification | Secret inspection; unit/E2E/build/lint bearer-role compatibility. |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary; Nest readiness is in-process.

## Migration / Rollout

No migration. Schema source must be in the base. Deploy keyrings before wiring; rollback consumers/config first and retain references through expiry.

Fresh child evidence supersedes the parent's stale 220–320 estimate without editing that non-implementing parent; no predecessor exception transfers. `sdd-tasks` must encode three dependency-ordered, independently testable and rollbackable slices: (1) crypto/config/readiness, 240–300 lines, tests vectors/validation/readiness, rollback provider/config registration; (2) repositories/classifier, 270–330 lines, PostgreSQL locks/races/reconciliation, rollback facades only; (3) revocation/cleanup/module/compatibility, 250–300 lines, purge/revocation/E2E, rollback wiring/cleanup. Total 760–930, each <400.

## Open Questions

None.
