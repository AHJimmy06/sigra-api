# Phase 4 PR #3 readiness

## Objective
Prepare the existing `feature/phase-4-tickets` PR for merge into `develop` today without touching the dirty local main checkout. Keep the current PR scope, correct only incremental validation defects, and preserve all baseline failures as evidence.

## Problem and constraints
PR head `de6005807745ce32d92a34c078d2d25344c934c9` builds and passes 205 tests but adds 32 lint errors over base `b71d20dc49b0cca77faeacd6392fc2faeb756776`; its committed OpenAPI file is stale (68 generated additions). Base already fails lint (587 errors/34 warnings) and OpenAPI check (127 additions/35 deletions). Original `sigra-api/` has 69 unrelated status entries; do not edit, reset, clean, or remove its worktrees. Work in isolated checkout only. Publish and merge only after an explicit delivery decision.

## Route, checks, and delivery
Route: one bounded `gentle-ai-worker` writer for multi-file source corrections; parent coordinates validation and commits. TDD mode: not enabled by any identified project/session configuration; ordinary checks. Test runner: `npm test -- --runInBand`. Required checks: `npm run build`, `npm test -- --runInBand`, incremental lint comparison against base, `npm run openapi:check`, `git diff --check`. `npm run lint` remains baseline-red; record delta rather than misreport a green result. RDD switch for this session: off. Delivery strategy: single existing PR with one coherent source/tests/generated-contract work-unit commit, no push until authorized. Forecast: approximately 200 authored changed lines plus generated OpenAPI artifact. Native review: only if user-owned switch enabled; inspect state before any candidate review.

## Tasks
- [x] T1 Correct incremental lint, ticket-detail public contract, and generated OpenAPI as one coherent source/tests/contract work unit. The code edits must explicitly project resident `id`/`name` only, use named public Swagger DTOs, document PATCH with `TicketResponseDto`, retain focused service/controller/OpenAPI tests, and include `docs/openapi/v1.json` generated from these changes. Acceptance: build, full tests (208), `openapi:check`, `git diff --check` pass, lint equals base count (587/34) with no introduced findings; neither internal `Resident` nor `MaintenanceTicket` Swagger schema remains. Commit only exact scoped files and this feature document, record SHA. Route: delegated multi-file writer plus parent mechanical artifact regeneration.
- [ ] T2 Confirm commit and PR head/base status, then request delivery decision for push/merge. Acceptance: exact work-unit commit ID, independent verification evidence and remaining baseline lint failure reported. Route: parent read-only state, user-owned delivery decision.

## Progress
T1 done. Work-unit commit `0cc25a3a855b76ac58392952512bb17e887de5f8` contains 11 exact source/test/contract files (254 additions, 88 deletions). Independent check before commit: build passes, 40 suites/208 tests pass, `openapi:check` passes, `git diff --check` passes; full lint remains 587 errors/34 warnings matching base, after removal of 32+3 new errors. Generated artifact has no internal `Resident` or `MaintenanceTicket` schema. T2 in progress. The runtime-created `.atl/` is untracked and excluded, `.gitignore` was restored before the work-unit commit; original checkout still has 69 pre-existing entries.

## Next step
Commit this progress document with the T1 work-unit SHA, confirm PR remote head and ask for the push/merge delivery decision.
