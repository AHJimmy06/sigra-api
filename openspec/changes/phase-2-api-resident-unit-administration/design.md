# Design: Phase 2 API Resident and Residential-Unit Administration

## Technical Approach

Extend the existing NestJS controller/service/TypeORM pattern. Services own transactions; explicit mappers emit allowlisted DTOs. PostgreSQL indexes and ordered row locks enforce normalized identity and active-unit invariants. Archive metadata remains independent from `active`.

## Architecture Decisions

| Option | Tradeoff | Decision and rationale |
|---|---|---|
| Canonical writes plus `lower(btrim(...))` indexes | Named database errors required | Use full unique expression indexes for `users.email` and `units.code`; database enforcement closes races and reserves archived identities. |
| Aggregate-owned migrations | More classes | Unit slices mutate only `units`; resident slices mutate only `users`/`residents`, making each chain slice reversible. Shared SQL/test helpers may be reused but own no schema or aggregate data. |
| Explicit mappers | Mapping overhead | `mapResidentResponse`/`mapUnitResponse` expose only DTO fields and `archivedAt`, never hashes, roles, linked users, or ORM relations. |
| Archive metadata | Two states | Unit archive preserves `active`; resident archive deactivates resident/user. Restore clears metadata while leaving both inactive. |
| Pessimistic unit locks | Waiting transactions | Invariant-changing paths lock units first, preventing assignment/deactivation races. |

## Data Flow

`controller → validation → service transaction → locks/checks → save → audit → mapper`

Create, assignment, activation, and resident restore lock affected units `FOR UPDATE` in UUID order, then resident, then linked user. After pre-lock unit discovery, re-read the resident and return 409 if it moved beyond the locked set. Unit deactivation/archive lock the unit before dependency checks. This **unit(s) → resident → user** order avoids deadlocks.

Deactivation rejects only active resident links. Unit archive rejects any `residents.unit_id` or `access_events.unit_id`; resident rows transitively retain passes/tickets/history. Archive/restore checks, writes, and transition audits are atomic. Repeated target-state commands return the safe resource without writes or audit. Archive never activates; resident archive disables linked access.

## File Changes

| File | Action | Description |
|---|---|---|
| `src/migrations/1724600005000-HardenUnitIdentity.ts` | Create | Unit code preflight, canonicalization, normalized index. |
| `src/migrations/1724600006000-HardenResidentIdentity.ts` | Create | User email preflight, canonicalization, normalized index. |
| `src/migrations/1724600007000-AddUnitArchiveMetadata.ts` | Create | `units` archive columns, actor FK, index. |
| `src/migrations/1724600008000-AddResidentArchiveMetadata.ts` | Create | `residents` archive columns, actor FK, index. |
| `src/config/typeorm.datasource.ts`, `src/config/typeorm-metadata.spec.ts` | Modify | Register order; prove ownership, parity, and composed up/down. |
| `src/common/{pagination.dto.ts,non-empty-patch.pipe.ts,http/http-error.contract.ts}` | Modify/Create | Archive filter, trimming, non-empty PATCH, conflicts. |
| `src/{residents,units}/*` | Modify | DTOs/mappers, detail, lifecycle, locks, checks, audits, tests. |
| `test/resident-unit-administration.e2e-spec.ts`, `src/openapi/openapi-artifact.spec.ts`, `docs/openapi/v1.json` | Create/Modify | HTTP and OpenAPI proof. |

## Interfaces / Contracts

Detail and collection reads accept `includeArchived=true|false`; collections retain `status=true|false` and `createdAt DESC,id DESC`. PATCH is non-empty; resident PATCH accepts normalized email. Archive/restore return 200 safe resources. Responses retain boolean `active`, add nullable `archivedAt`, and keep `archivedByUserId` internal.

Each identity migration preflights only its aggregate and reports normalized values/row IDs before DDL, then canonicalizes values and installs its named full expression index. Archive migrations add metadata only to their owning table. Actor FKs reference `users.id` with `ON DELETE SET NULL`. Resident restore requires one linked `RESIDENT` user and an active unit. Only named `23505` constraints map to 409; missing rows map to 404, invariant conflicts to 409, validation to 400.

## Testing Strategy

| Layer | Coverage |
|---|---|
| Unit | Validation, mappers, filters, dependency semantics, no-op audits, errors. |
| PostgreSQL | Per-aggregate collision/up/down ownership, composed rollback, write races, lock order, audit rollback. |
| HTTP/OpenAPI | ADMIN paths, 400/401/403/404/409 envelopes, archive visibility, pagination, lifecycle independence, dependencies, leak prevention. |

## Threat Matrix

| Boundary | Applicability | Response |
|---|---|---|
| Documentation-like paths | N/A — no executable classification | None. |
| Git repository selection | N/A — no VCS implementation | None. |
| Commit/push state | N/A — no VCS automation | None. |
| PR commands | N/A — no PR composition | None. |

HTTP acceptance tests cover routes; no shell/process boundary is introduced.

## Migration / Rollout

Use the six-slice feature-branch chain, each child targeting its predecessor: (1) contracts/detail/mappers; (2) unit identity migration and locking; (3) resident identity migration and locking; (4) unit archive migration and lifecycle; (5) resident archive migration and linked-user lifecycle; (6) acceptance/OpenAPI. Keep tests and rollback with each slice; use `size:exception` only after one honest split cannot meet 400 authored changed lines.

Rollback ordering is mandatory: disable archive writes while retaining restore capability; restore archived records through that retained operational mechanism; revert application slices in reverse order; run down migrations in reverse and restore prior uniqueness constraints. New archives remain blocked throughout rollback, and restore capability remains until restoration finishes. Down migrations preserve history and canonicalized email/code values; no records are deleted and normalization is not reversed.

## Open Questions

None.
