# Phase 5 API access-response candidate

## Objective
Prepare one local, reviewable API Phase 5 candidate based on current `origin/develop` `148727a9d82eb28de82ea2e3e9326564aff08c72` without updating any existing PR, pushing, or merging. The three open API PRs #4/#5/#6 currently point to the same old-base commit `f2d1aed76d10c421f786487660c601a636eb30a4`.

## Scope and decisions
The candidate's incremental value is guard validation identity for a successful scan. Preserve the Phase 5 reason codes in `sigra-web/docs/backend-phase-5.md` and current web labels. Explicit user decision: keep short TOTP policy (`window: 1`, `expiresInSeconds: 30`); do not cherry-pick the old commit's `window: 20`, 600-second claim, or changed reasons. Only reveal resident name/unit to an authorized guard for `ALLOWED` decisions; no identity for denied decisions. Repeated compatible `clientEventId` must return the same permitted identity after reloading the event, without re-evaluating QR or returning more information than the initial result. The original `sigra-api/` and preexisting Phase 3 worktrees must remain untouched. This worktree is branch `fix/phase-5-access-response` at the updated develop baseline.

## Route and verification
TDD mode: off (no explicit configured TDD mode found), source: project/session inspection; ordinary tests. Runner: `npm test -- --runInBand`; focused command `npm test -- --runInBand src/access/access.service.spec.ts`. Delegate the multi-file writer with exact edit surfaces. Work-unit commit on this isolated feature branch after tests and docs checks; no push or PR creation without a user decision. Review workload forecast: under 200 authored diff lines if no unexpected scope. RDD session switch: off. Baseline lint remains red with 587 errors/34 warnings; no new findings are acceptable.

## Tasks
- [x] T1 Implement safe optional `residentName`/`unitCode` in the validation response for ALLOWED events only, including successful retry/concurrency path and focused tests; retain existing TOTP/reason behavior. Edit surfaces: `src/access/access.dto.ts`, `src/access/access.service.ts`, `src/access/access.service.spec.ts`, and generated `docs/openapi/v1.json` only if regeneration proves it necessary. Acceptance: build, focused and full tests, OpenAPI check, no incremental lint, `git diff --check`. Route: delegated writer because 2+ nontrivial files; single work-unit commit records SHA.
- [ ] T2 Independently verify the candidate against the documented Phase 5 contract, report residual baseline failures, exact commit, and a proposed PR consolidation plan. Do not push or merge. Route: delegated verifier for commands, parent for report.

## Progress
T1 done: source/test/generated-contract work-unit commit `1c43fa317d4a256422aee20e36a84824beb3e115` on branch `fix/phase-5-access-response` includes four exact files (91 additions/1 deletion). Delegated writer and independent verifier observed `npm ci`, build, focused access tests (6), full 40 suites/209 tests, `openapi:check`, `git diff --check` pass; full lint remains baseline-red at 587 errors/34 warnings, changed files lint clean. Parent confirmed `.gitignore` restored; untracked runtime `.atl/` excluded. No source change to `window: 1`, `expiresInSeconds: 30`, or reason codes. T2 in progress. Review of old commit: raw head passed build/205 tests, failed OpenAPI (stale) and lint (624/35); it is not the new integration candidate.

## Next step
Record this feature document, confirm commit and remote PR status without publishing, and report the proposed single-PR strategy.
