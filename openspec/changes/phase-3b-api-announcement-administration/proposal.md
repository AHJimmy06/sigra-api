# Proposal: Phase 3B API Announcement Administration

## Outcome

Phase 3B delivered the ADMIN announcement contract in one maintainer-approved
`size:exception` PR under `exception-ok`. It preserves the unrelated Phase 3
umbrella and excludes 3C synchronization, 3D OpenAPI proof, 3E Web work, and
Phase 3A schema ownership.

## Delivered Scope

- ADMIN list, detail, create, strict PATCH, and idempotent
  `POST /api/announcements/:id/archive`.
- Snapshot-only allowlisted author projection, archive visibility, and ordering.
- Transactional audits, row locking, no-op semantics, and PostgreSQL proof.

## Delivery Record

- Original forecast: 1,050–1,400 changed lines.
- Final observed size: 2,120 changed lines (1,975 additions + 145 deletions).
- Observed pair totals: 702, 387, 155, and 1,080 lines for 3B.1–3B.4.
- Review decision: one PR; maintainer-approved `size:exception`; no chained PR.

The original forecast is history only. The final observed size is authoritative
and did not justify weakening code, tests, harness work, or proof.

## Success Criteria

- [x] ADMIN routes, validation, projection, archive visibility, and lifecycle
      behavior meet the contract.
- [x] Audit behavior is ordered, atomic, and concurrency-proven on PostgreSQL.
- [x] The 19 scoped paths contain no Phase 3A schema/entity/migration, 3C, 3D,
      or 3E work.

Next: `sdd-verify`.
