## Exploration: Phase 3A0 API disposable PostgreSQL test harness

### Current State

`test/resident-unit-administration.e2e-spec.ts` owns an inline PostgreSQL 16 Docker lifecycle: a unique container name, fixed `execFile` argv, `127.0.0.1::5432`, environment-supplied password, 60 × 250 ms readiness polling, dynamic port discovery, and forced removal in `afterAll`. Its 9 resident/unit scenarios and application bootstrap are unrelated to the lifecycle and must remain byte/behavior-equivalent apart from imports and lifecycle call sites.

The same lifecycle concept is duplicated more extensively in `src/config/typeorm-metadata.spec.ts`, and again in `src/auth/session-foundation/postgres.spec.ts`. Those implementations are out of scope: Phase 3A0 should extract only the resident E2E copy and must not refactor metadata, schema-dump, catalog, session, application, or production Docker behavior.

The current resident readiness command selects a database and user, but uses the container-local default connection and does not force TCP password authentication. Therefore it does not strictly prove the “authenticated readiness” property required by the validated Phase 3A design. The helper must preserve the query probe while making authentication explicit with container TCP plus `PGPASSWORD`, still without a shell or password-bearing command string.

The existing E2E Jest config already discovers `*.e2e-spec.ts` under `test/`, so a focused mocked helper contract can live at `test/support/disposable-postgres.e2e-spec.ts` without changing package scripts or Jest configuration. `npm run test:e2e -- --runInBand --runTestsByPath ...` can independently run that contract and the resident regression.

### Affected Areas

- `test/support/disposable-postgres.ts` — new isolated helper and exact public contract; estimated 85–100 additions.
- `test/support/disposable-postgres.e2e-spec.ts` — focused subprocess/lifecycle tests using mocked `node:child_process`; estimated 105–125 additions.
- `test/resident-unit-administration.e2e-spec.ts` — replace only inline Docker imports, state, startup/options, cleanup, and local lifecycle functions; preserve all scenarios and application/database behavior; estimated 12–18 additions plus 45–55 deletions.
- `package.json` and `test/jest-e2e.json` — verified as sufficient; no changes planned.
- `src/config/typeorm-metadata.spec.ts` and `src/auth/session-foundation/postgres.spec.ts` — reference implementations only; no changes planned.

Forecast: approximately 247–298 total changed lines, leaving a 102–153 line margin below the hard 400-line cap. The gate must count additions plus deletions from `HEAD`, including both untracked support files via `git diff --no-index --numstat /dev/null <file>`.

### Approaches

1. **Minimal resident extraction with a focused mocked contract** — create one public helper, test its subprocess protocol/failure cleanup in an isolated E2E-discovered spec, and retrofit only resident lifecycle call sites.
   - Pros: Meets the 3A0 prerequisite, proves failure paths deterministically, keeps Phase 3A consumption stable, preserves resident scenarios, supports independent rollback, and retains substantial review-budget margin.
   - Cons: Leaves deliberate lifecycle duplication in metadata and session tests; mocked failure proof verifies cleanup attempts rather than Docker-daemon success under infrastructure failure.
   - Effort: Medium

2. **Consolidate every PostgreSQL test harness now** — migrate resident, metadata, and session tests to one generalized helper.
   - Pros: Removes more duplication and could centralize future lifecycle maintenance.
   - Cons: Violates the child boundary, couples unrelated suites, expands regression scope, risks metadata/schema behavior drift, and is unlikely to retain a safe sub-400-line diff.
   - Effort: High

### Recommendation

Use approach 1 and freeze this exact exported interface:

```typescript
startDisposablePostgres(prefix: string): Promise<{
  options: {
    type: 'postgres';
    host: '127.0.0.1';
    port: number;
    username: string;
    password: string;
    database: string;
  };
  stop(): Promise<void>;
}>
```

Expose no container internals. Validate `prefix` against a short lowercase alphanumeric/hyphen grammar before spawning, then build a unique container name from the validated prefix, PID, and UUID. Generate PostgreSQL-safe database/user identifiers independently from PID/UUID. Invoke only `execFile('docker', argv, { shell: false, ... })`, use bounded subprocess timeouts, publish `127.0.0.1::5432`, and provide `POSTGRES_PASSWORD` through the child environment.

Readiness must remain bounded to 60 attempts separated by 250 ms, but run `psql` over container TCP (`--host 127.0.0.1`) with `PGPASSWORD` supplied through `docker exec --env PGPASSWORD` and the Docker child environment. Parse and validate the published port before returning literal loopback connection options.

Any failure after a container name is allocated must attempt `docker rm --force <name>` and retain both primary and cleanup failures when cleanup also fails. `stop()` must memoize its removal promise so repeated or concurrent calls issue at most one forced removal. Every `execFile` call must be timeout-bounded so the helper retains no child process indefinitely.

Focused tests should prove exact fixed argv and `shell: false`, safe unique naming, password-free command strings, authenticated readiness, loopback/dynamic-port options, bounded readiness exhaustion with forced cleanup, cleanup-error retention, and repeated/concurrent `stop()` idempotence. Then run the complete existing resident file unchanged in scenario content:

```bash
npm run test:e2e -- --runInBand --runTestsByPath test/support/disposable-postgres.e2e-spec.ts
npm run test:e2e -- --runInBand --runTestsByPath test/resident-unit-administration.e2e-spec.ts
```

Rollback is independent before Phase 3A consumption: delete the two support files and restore the resident E2E’s inline imports, variables, startup, port discovery, cleanup, and local helper functions. No package/config/runtime/schema rollback is required. If Phase 3A already consumes the helper, roll back that dependent change first.

### Risks

- Jest mocking of `node:child_process` must occur before importing the helper because promisification captures the callback; otherwise focused tests may invoke real Docker.
- Cleanup can only guarantee a bounded forced-removal attempt; Docker-daemon failure must be surfaced, never swallowed or represented as successful cleanup.
- Strengthening the current local-socket probe to explicit TCP password authentication is required for the stated contract, but tests must freeze it so later refactors cannot silently weaken readiness.
- A broad extraction from the 1,550-line metadata proof or the session PostgreSQL boundary would break rollback independence and threaten the 400-line cap.

### Ready for Proposal

Yes. The exact one-argument typed API, security/process invariants, focused proof strategy, resident-only retrofit boundary, file-level forecast, independent rollback, and hard changed-line gate are sufficiently frozen. The orchestrator should proceed to the child proposal while retaining the dependency order `3A0 → 3A → 3B`.
