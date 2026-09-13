# Design: Phase 3A0 API PostgreSQL Test Harness

## Technical Approach

Extract only the resident PostgreSQL lifecycle into a typed helper. It owns identifiers, fixed-argv Docker execution, authenticated readiness, port discovery, and cleanup; resident bootstrap and all 9 scenarios remain unchanged.

## Architecture Decisions

| Decision | Alternative | Choice and rationale |
|---|---|---|
| Process API | Shell/composed command | Promisify `node:child_process.execFile` at module load, pass `shell: false`, and mock before requiring the helper; this prevents shell interpretation and real Docker in focused tests. |
| Identifiers | Reuse caller prefix | Accept `/^[a-z0-9](?:[a-z0-9-]{0,22}[a-z0-9])?$/u` (1–24 chars). Build container `<prefix>-<pid>-<uuid>` and independent `sigra_db_<pid>_<uuid32>` / `sigra_user_<pid>_<uuid32>` identifiers; generate the password separately. Database identifiers stay under 63 bytes and repeated prefixes stay unique. |
| Secrets | `KEY=value` argv | Docker argv carries environment variable names only. Values are overrides in `{ ...process.env, KEY: value }`; the helper logs nothing. In particular, `docker exec --env PGPASSWORD` receives literal argv `--env`, `PGPASSWORD`, while the secret exists only in the Docker client process environment and is copied into `psql`’s environment. |
| Bounds and cleanup | Unbounded calls / best effort | `run` timeout 20,000 ms; readiness probe 1,000 ms; `port`/`rm` 5,000 ms. Probe at most 60 times with 250 ms between failed attempts (no delay after attempt 60). Memoize the removal promise, including rejection. |

## Data Flow

`validate/generate → docker run → 60-attempt TCP probe → docker port → { options, stop }`

After name allocation, failure calls memoized `stop()`. Cleanup failure produces `AggregateError([primary, cleanup])`; successful cleanup rethrows the primary. Resident teardown settles app close, datasource destroy, and `stop()`, then aggregates every rejection.

## Docker Protocol

| Operation | Fixed argv after `docker` |
|---|---|
| Run | `run --detach --name <container> --publish 127.0.0.1::5432 --env POSTGRES_DB --env POSTGRES_USER --env POSTGRES_PASSWORD postgres:16-alpine` |
| Ready | `exec --env PGPASSWORD <container> psql --host 127.0.0.1 --username <user> --dbname <db> --command SELECT 1` |
| Port | `port <container> 5432/tcp` |
| Stop | `rm --force <container>` |

Port output must be one `127.0.0.1:<port>` endpoint with an integer in 1–65535; otherwise startup fails and cleans up.

## File Changes and Budget

| File | Action | + | − |
|---|---|---:|---:|
| `test/support/disposable-postgres.ts` | Create | 95 | 0 |
| `test/support/disposable-postgres.e2e-spec.ts` | Create | 120 | 0 |
| `test/resident-unit-administration.e2e-spec.ts` | Modify lifecycle only | 15 | 50 |

**Frozen forecast: 230 additions + 50 deletions = 280 changed lines. Hard stop at 400 or more.** No other files may change.

Measure tracked and untracked implementation paths from repository root:

```bash
paths=(test/support/disposable-postgres.ts test/support/disposable-postgres.e2e-spec.ts test/resident-unit-administration.e2e-spec.ts); new=(test/support/disposable-postgres.ts test/support/disposable-postgres.e2e-spec.ts)
tracked=$(git diff HEAD --numstat -- "${paths[@]}" | awk '$1~/^[0-9]+$/&&$2~/^[0-9]+$/{n+=$1+$2}END{print n+0}'); untracked=0
for p in "${new[@]}"; do if ! git ls-files --error-unmatch -- "$p" >/dev/null 2>&1 && [ -f "$p" ]; then s=$(git diff --no-index --numstat -- /dev/null "$p"); r=$?; [ "$r" -le 1 ] || exit "$r"; n=$(printf '%s\n' "$s" | awk '$1~/^[0-9]+$/&&$2~/^[0-9]+$/{n+=$1+$2}END{print n+0}'); untracked=$((untracked+n)); fi; done
total=$((tracked+untracked)); printf '%s\n' "$total"
[ "$total" -lt 400 ] || { printf 'Phase 3A0 hard stop: %s changed lines\n' "$total" >&2; exit 1; }
```

## Interfaces / Contracts

Export only `startDisposablePostgres(prefix: string): Promise<{ options: { type: 'postgres'; host: '127.0.0.1'; port: number; username: string; password: string; database: string }; stop(): Promise<void> }>`; expose no container state.

## Testing Strategy

The focused E2E spec places `jest.mock('node:child_process')` before `require('./disposable-postgres')`, because promisification captures the callback. Callback outcomes and fake timers prove validation, uniqueness, exact argv/options/timeouts, secret-free argv, environment forwarding, TCP auth, port validation, 60-probe exhaustion, startup cleanup, dual errors, and concurrent/repeated stop issuing one `rm`.

```bash
npm run test:e2e -- --runInBand --runTestsByPath test/support/disposable-postgres.e2e-spec.ts
npm run test:e2e -- --runInBand --runTestsByPath test/resident-unit-administration.e2e-spec.ts
npm run lint
npm run build
```

## Threat Matrix

| Boundary | Minimum adversarial cases | Applicability | Design response | Planned RED tests |
|---|---|---|---|---|
| Documentation-like paths | `requirements.txt`, `CMakeLists.txt`, executable Markdown/MDX, `README.sh` | N/A: no executable classification | None | None |
| Git repository selection | `git -C`, relative paths, absolute paths | N/A: no repository-selection process | Gate runs from declared repository root | None |
| Commit state | staged, `commit -a`, empty index | N/A: gate neither stages nor commits | Measurement reads HEAD, index, worktree, and declared untracked files | None |
| Push state | tracking branch, first push, explicit refspec | N/A: no push behavior | None | None |
| PR commands | explicit `--head`, environment prefix, composed commands | N/A: no PR automation | None | None |

## Migration / Rollout

No migration required. Land before Phase 3A. Roll back dependent Phase 3A first if present; then delete both support files and restore the resident lifecycle from pre-3A0 HEAD. No package, config, schema, or runtime rollback.

## Open Questions

None.
