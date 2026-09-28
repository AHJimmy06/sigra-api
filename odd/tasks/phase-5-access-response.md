# Phase 5 API access-response candidate

## Objective
Prepare one local, reviewable API Phase 5 candidate based on current `origin/develop` `148727a9d82eb28de82ea2e3e9326564aff08c72` without updating any existing PR, pushing, or merging. The three open API PRs #4/#5/#6 currently point to the same old-base commit `f2d1aed76d10c421f786487660c601a636eb30a4`.

## Scope and decisions
The candidate's incremental value is guard validation identity for a successful scan. Preserve the Phase 5 reason codes in `sigra-web/docs/backend-phase-5.md` and current web labels. Explicit user decision: keep short TOTP policy (`window: 1`, `expiresInSeconds: 30`); do not cherry-pick the old commit's `window: 20`, 600-second claim, or changed reasons. Only reveal resident name/unit to an authorized guard for `ALLOWED` decisions; no identity for denied decisions. Repeated compatible `clientEventId` must return the same permitted identity after reloading the event, without re-evaluating QR or returning more information than the initial result. The original `sigra-api/` and preexisting Phase 3 worktrees must remain untouched. This worktree is branch `fix/phase-5-access-response` at the updated develop baseline.

## Route and verification
TDD mode: off (no explicit configured TDD mode found), source: project/session inspection; ordinary tests. Runner: `npm test -- --runInBand`; focused command `npm test -- --runInBand src/access/access.service.spec.ts`. Delegate the multi-file writer with exact edit surfaces. Work-unit commit on this isolated feature branch after tests and docs checks; no push or PR creation without a user decision. Review workload: 248 authored diff lines (91 source/initial tests plus 157 follow-up tests), under the advisory ~400-line slice heuristic; extra tests directly cover compatible race and null-resident fallback. RDD session switch: off. Baseline lint remains red with 587 errors/34 warnings; no new findings are acceptable.

## Tasks
- [x] T1 Implement safe optional `residentName`/`unitCode` in the validation response for ALLOWED events only, including successful retry/concurrency path and focused tests; retain existing TOTP/reason behavior. Edit surfaces: `src/access/access.dto.ts`, `src/access/access.service.ts`, `src/access/access.service.spec.ts`, and generated `docs/openapi/v1.json` only if regeneration proves it necessary. Acceptance: build, focused and full tests, OpenAPI check, no incremental lint, `git diff --check`. Route: delegated writer because 2+ nontrivial files; single work-unit commit records SHA.
- [ ] T2 Independently verify the candidate against the documented Phase 5 contract, report residual baseline failures, exact commit, and a proposed PR consolidation plan. Do not push or merge. Route: delegated verifier for commands, parent for report.

## Progress
T1 done: source/test/generated-contract work-unit `1c43fa317d4a256422aee20e36a84824beb3e115` and focused retry/fallback test work-unit `0533db634f004e1a9deb2fa79e20eb9b918bc6a6`, with progress-document commit `af31ca56` between them. Independent verifier observed build, 40 suites/211 tests, OpenAPI, focused lint and diff checks pass on the resulting candidate. Full lint was not rerun after test-only change; before it, full lint was baseline-red at 587/34 and touched files lint clean. `window: 1`, `expiresInSeconds: 30`, and reasons unchanged. T2 in progress. Runtime `.atl/` remains untracked and excluded. Web-side Phase 5 contract document does not yet list optional identity fields, which must be coordinated before merge. No push/merge/PR creation.

## Next step
Commit this updated progress document, confirm base and candidate identities, then report single-PR strategy and documentation gap for web owner.
