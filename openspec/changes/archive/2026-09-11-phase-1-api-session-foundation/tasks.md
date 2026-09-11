# Tasks: Phase 1 API Session Foundation

Parent is non-implementing: `parent_apply: prohibited`. API repository root: `.`. Do not create branches or product code from this change.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 380–560 total; schema 160–240, primitives 220–320 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Tracker → schema → primitives |
| Delivery strategy | exception-ok |
| Chain strategy | feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High
Maintainer-approved `size:exception` applies to every child slice and supersedes the original under-400/no-exception forecast. The feature-branch-chain remains the selected delivery strategy; no PR, push, or remote delivery fact is implied by this tracker.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Physical session schema | Schema → tracker | `npm test -- --runInBand config/typeorm-metadata.spec.ts` | `npm run db:dev:up && npm run migration:run && npm run migration:revert && npm run db:dev:down` | Session entities, migration, datasource, parity test |
| 2 | Runtime primitives | Primitives → schema | `npm test -- --runInBand auth/session-foundation` | N/A — scope has no endpoint; readiness is bootstrap-tested | Session-foundation module/config/tests |

Selected feature-branch-chain semantics: a future tracker would target `develop`, schema would target the tracker, and primitives would target the schema branch. No tracker or child PR currently exists; retarget/rebase polluted child diffs before any future review.

## Phase 1: Schema Handoff and Delivery

- [x] 1.1 Create `openspec/changes/phase-1-api-session-schema/proposal.md`, `specs/api-session-schema/spec.md`, `design.md`, and `tasks.md` as the OpenSpec handoff owning only R1/Persist reconciliation facts and R6/Forward and reverse parity.
- [x] 1.2 Plan schema RED → GREEN → REFACTOR: fail parity/migration tests before `src/auth/**/*.entity.ts`, `src/migrations/*session*`, `src/config/typeorm.datasource.ts`, and `src/config/typeorm-metadata.spec.ts`; preserve every DDL constraint/index in design.
- [x] 1.3 Apply schema under its maintainer-approved `size:exception`; record `npm test -- --runInBand config/typeorm-metadata.spec.ts`, `npm run db:dev:up && npm run migration:run && npm run migration:revert && npm run db:dev:down`, forward/reverse evidence, and rollback of operations then sessions. Evidence: committed baseline `8ec3dcf98fe7d33a1bc2215bd406532f3c02cf2a`; archived schema verification records focused 15/15 plus forward/reverse PostgreSQL proof.
- [x] 1.4 Verify/archive schema: confirm no raw secret columns, bearer compatibility via `npm test`, OpenSpec completion, and archive its delta before primitives starts. Evidence: `openspec/changes/archive/2026-09-10-phase-1-api-session-schema/{verify-report,archive-report}.md`; canonical `openspec/specs/api-session-schema/spec.md` exists.

## Phase 2: Primitives Handoff and Delivery

- [x] 2.1 After archived schema handoff, create `openspec/changes/phase-1-api-session-primitives/proposal.md`, `specs/api-session-primitives/spec.md`, `design.md`, and `tasks.md` owning only R2–R5/R7 and their ten named scenarios. Evidence: `openspec/changes/archive/2026-09-11-phase-1-api-session-primitives/{proposal,specs/api-session-primitives/spec,design,tasks}.md`.
- [x] 2.2 Plan RED → GREEN → REFACTOR before `src/auth/session-foundation/**`, `src/auth/auth.module.ts`, and `src/config/env.validation.ts`: concurrent lock; predecessor retry; successor reconciliation; conflict-before-mutation; distinct-operation reuse; user-wide revocation; safe bounded purge; keyring separation/invalid keyring; boundary verification. Evidence: archived primitives `apply-progress.md` records task-level RED → GREEN → REFACTOR evidence for all 12 child tasks.
- [x] 2.3 Apply primitives after schema is present in its actual integration base under its maintainer-approved `size:exception`; use caller managers, operation-first classification, CTE `SKIP LOCKED` cleanup, canonical HMAC/HKDF, and persisted-version readiness. Evidence: committed primitives `bc55116fce61bc1662cea0cc0cd754181a665530` follows schema baseline `8ec3dcf98fe7d33a1bc2215bd406532f3c02cf2a`.
- [x] 2.4 Verify/archive primitives: record `npm test -- --runInBand auth/session-foundation`, `npm test`, `npm run build`, and `npm run lint`; prove retained-key compatibility, no raw secrets, unchanged bearer/role behavior, rollback consumers then retain references through expiry. Evidence: archived verification passed 5/5 requirements, 10/10 scenarios, focused 19/19, unit 117/117, E2E 16/16, build, and lint; canonical `openspec/specs/api-session-primitives/spec.md` exists.

## Phase 3: Chain Closure

- [x] 3.1 Verify the local integration boundary: each child is a self-contained committed work-unit with its archived tests, exact results, rollback evidence, and canonical specification; schema baseline `8ec3dcf98fe7d33a1bc2215bd406532f3c02cf2a` precedes primitives `bc55116fce61bc1662cea0cc0cd754181a665530`; archive both child OpenSpec changes, then advance the tracker for independent SDD verification. The original PR and under-400 requirements are revised because no PR/push exists and approved `size:exception` supersedes the original forecast; the combined branch was clean before transferred tracker/schema evidence and is a self-contained local integration base.
