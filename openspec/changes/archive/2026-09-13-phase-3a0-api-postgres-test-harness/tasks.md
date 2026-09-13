# Tasks: Phase 3A0 API PostgreSQL Test Harness

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 280 (230 additions + 50 deletions) |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes — this is one autonomous prerequisite slice |
| Suggested split | PR #1: this harness; Phase 3A follows on its branch |
| Delivery strategy | auto-chain |
| Chain strategy | feature-branch-chain; PR #1 base = Phase 3 tracker |
| Verification cost | Focused mocked E2E, resident 9-scenario E2E, full E2E, lint, build, diff/size audit |
| Rollback boundary | Delete the two support files and restore only the resident inline lifecycle; no package/config/schema rollback |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Secure helper plus resident-only retrofit | PR #1, base Phase 3 tracker | `npm run test:e2e -- --runInBand --runTestsByPath test/support/disposable-postgres.e2e-spec.ts test/resident-unit-administration.e2e-spec.ts` | Docker PostgreSQL 16 resident E2E; helper mock suite uses no Docker | Revert `test/support/disposable-postgres.ts`, `test/support/disposable-postgres.e2e-spec.ts`, and lifecycle-only changes in `test/resident-unit-administration.e2e-spec.ts` |

## Phase 1: Baseline and RED Proof

- [x] 1.1 From repository root, capture `git rev-parse --show-toplevel`, `git status --short --untracked-files=all`, `git diff HEAD --stat`, and the exact intended inventory: new `test/support/disposable-postgres.ts`, new `test/support/disposable-postgres.e2e-spec.ts`, modified `test/resident-unit-administration.e2e-spec.ts`; stop if any other implementation path changes.
- [x] 1.2 **RED:** create `test/support/disposable-postgres.e2e-spec.ts`; mock `node:child_process` before importing the helper and add failing tests for the exact typed contract, prefix validation/uniqueness, fixed argv/`shell:false`/finite timeouts, secret-free argv and env forwarding.
- [x] 1.3 **RED:** extend the same spec with failing readiness tests (TCP auth, `PGPASSWORD`, max 60 × 250 ms), invalid port, bounded startup failure cleanup, AggregateError primary+cleanup retention, and concurrent/repeated stop issuing one removal.

## Phase 2: GREEN Helper and Refactor Checkpoint

- [x] 2.1 **GREEN:** create `test/support/disposable-postgres.ts` exporting only `startDisposablePostgres(prefix: string)`; implement safe unique identifiers, PostgreSQL 16 dynamic loopback publication, fixed `execFile` protocol, bounded probes, validated port, and memoized forced removal.
- [x] 2.2 **GREEN checkpoint:** run the focused helper command from Unit 1; require every RED test to pass without real Docker, then refactor only for typed clarity while preserving exact argv, timeout, error, and cleanup assertions.

## Phase 3: Resident Integration and Regression

- [x] 3.1 Replace only the inline lifecycle in `test/resident-unit-administration.e2e-spec.ts` with the helper; preserve bootstrap, teardown aggregation, application/database behavior, and all 9 scenario bodies unchanged.
- [x] 3.2 **GREEN checkpoint:** run the resident path from Unit 1 against real PostgreSQL 16 and record 9/9 unchanged scenarios passing; then run `npm run test:e2e -- --runInBand`, `npm run lint`, and `npm run build`.

## Phase 4: Evidence and Hard Gate

- [x] 4.1 Run `git diff HEAD --check` and the design’s tracked-plus-untracked `git diff --no-index` line-count command; record additions+deletions and hard-stop at `>=400`.
- [x] 4.2 Record focused/full regression, lint, build, diff-check outputs, exact changed-path inventory, and rollback evidence; do not modify package/config/production/schema files or commit.
