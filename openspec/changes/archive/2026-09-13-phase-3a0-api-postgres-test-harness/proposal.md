# Proposal: Phase 3A0 API PostgreSQL Test Harness

## Intent

Extract the resident E2E suite's disposable PostgreSQL lifecycle into a secure, typed helper. This prerequisite isolates infrastructure churn before Phase 3A while preserving all resident scenarios and keeping review workload below the hard 400-line limit.

## Scope

### In Scope
- Add `startDisposablePostgres(prefix: string)` with the exact validated typed return contract.
- Prove fixed-argv execution, process security, authenticated readiness, bounded failures, cleanup retention, and idempotent stop through focused mocked tests.
- Retrofit only resident E2E lifecycle call sites without changing its 9 scenarios or application/database behavior.
- Enforce a total forecast of 247–298 changed lines and an actual total below 400.

### Out of Scope
- Announcement schema or business behavior; Phase 3A owns those changes.
- Metadata/session harness consolidation, package/Jest configuration, application/production Docker, OpenAPI, Web, Mobile, or push.

## Capabilities

### New Capabilities
- `api-postgres-test-harness`: Secure disposable PostgreSQL lifecycle and deterministic cleanup contract for API E2E tests.

### Modified Capabilities
None.

## Approach

Freeze this interface:

```typescript
startDisposablePostgres(prefix: string): Promise<{
  options: { type: 'postgres'; host: '127.0.0.1'; port: number;
    username: string; password: string; database: string };
  stop(): Promise<void>;
}>
```

Validate the prefix, generate safe unique container/database/user identifiers, and invoke only timeout-bounded `execFile('docker', argv, { shell: false, ... })`. Start PostgreSQL 16 on a dynamic loopback port, authenticate readiness over container TCP with environment-supplied credentials for at most 60 attempts at 250 ms intervals, and memoize forced removal. Preserve primary and cleanup failures. Freeze these invariants with mocked subprocess tests, then replace only the resident suite's inline lifecycle.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `test/support/disposable-postgres.ts` | New | Exact typed lifecycle helper |
| `test/support/disposable-postgres.e2e-spec.ts` | New | Mocked process, security, and cleanup proof |
| `test/resident-unit-administration.e2e-spec.ts` | Modified | Lifecycle-only retrofit; scenarios unchanged |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Mock ordering invokes real Docker | Medium | Mock `node:child_process` before helper import |
| Cleanup hides the primary failure | Medium | Retain and report both failures |
| Scope exceeds review limit | Low | Stop if additions plus deletions reach 400 |

## Rollback Plan

Before Phase 3A consumption, delete both support files and restore the resident suite's inline lifecycle. If Phase 3A already depends on the helper, roll back Phase 3A first. No package, config, runtime, or schema rollback is required.

## Dependencies

- Existing Docker/PostgreSQL E2E environment.
- Phase 3A depends on successful completion of 3A0.

## Success Criteria

- [ ] The exported API exactly matches the validated one-argument typed contract.
- [ ] Focused tests prove process/security/readiness/cleanup invariants without real Docker.
- [ ] All 9 resident E2E scenarios remain unchanged and pass with the helper.
- [ ] Total changed lines remain within 247–298 and below 400.
