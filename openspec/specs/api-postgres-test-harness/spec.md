# API PostgreSQL Test Harness Specification

## Purpose

Provide a secure disposable PostgreSQL lifecycle for API E2E tests.

## Requirements

### Requirement: Typed helper contract

The helper MUST export only `startDisposablePostgres(prefix: string)`, returning `Promise<{ options: { type: 'postgres'; host: '127.0.0.1'; port: number; username: string; password: string; database: string }; stop(): Promise<void> }>` and no container internals.

#### Scenario: Valid start returns loopback options
- GIVEN a valid prefix and available Docker
- WHEN the helper starts PostgreSQL
- THEN it returns credentials, a numeric port, and host exactly `127.0.0.1`

### Requirement: Validated unique identifiers

The helper MUST accept only a short lowercase alphanumeric/hyphen prefix grammar, reject invalid prefixes before spawning, and derive unique safe identifiers.

#### Scenario: Invalid or repeated prefixes
- GIVEN an invalid prefix, or two starts using the same valid prefix
- WHEN the helper is called
- THEN invalid input fails without spawning and valid calls receive distinct safe identifiers

### Requirement: Secure bounded subprocess protocol

Every Docker invocation MUST use fixed argv with `execFile('docker', argv, { shell: false, ... })`, a bounded timeout, and MUST NOT place secrets in command strings or argv.

#### Scenario: Invocation security is inspectable
- GIVEN mocked child-process execution
- WHEN startup, readiness, and removal commands are issued
- THEN each command has fixed arguments, `shell:false`, a finite timeout, and no secret in its command string

### Requirement: PostgreSQL 16 dynamic publication

Startup MUST run PostgreSQL 16, publish port 5432 to a dynamic loopback port, provide `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` through the child environment, and return that validated port.

#### Scenario: Dynamic port discovery
- GIVEN PostgreSQL 16 starts successfully
- WHEN the published port is queried and validated
- THEN the options identify the loopback port, database, user, and password

### Requirement: Authenticated TCP readiness

Readiness MUST use PostgreSQL TCP authentication against `127.0.0.1`, with `PGPASSWORD` supplied through `docker exec --env`, and stop after at most 60 attempts separated by 250 ms.

#### Scenario: Readiness succeeds or exhausts its bound
- GIVEN the container is starting or never becomes ready
- WHEN readiness probes run
- THEN `psql` authenticates over TCP, succeeding or exhausting at most 60 × 250 ms attempts before cleanup

### Requirement: Failure-preserving cleanup

After a container name is allocated, any failed lifecycle operation MUST attempt forced removal. If both fail, the reported error MUST retain both failures.

#### Scenario: Cleanup failure is retained
- GIVEN startup fails and forced removal also fails
- WHEN the helper rejects
- THEN the rejection identifies both the primary failure and cleanup failure

### Requirement: Idempotent stop

`stop()` MUST memoize its removal promise so repeated or concurrent calls issue no more than one forced removal for a container.

#### Scenario: Concurrent repeated stop
- GIVEN a successfully started helper
- WHEN `stop()` is called repeatedly and concurrently
- THEN exactly one removal is issued and all callers observe the same completion or failure

### Requirement: Resident lifecycle-only retrofit

The resident E2E MUST replace only its inline disposable-PostgreSQL lifecycle with the helper; all 9 scenarios, assertions, bootstrap, and application/database behavior MUST remain unchanged.

#### Scenario: Resident regression
- GIVEN the helper and resident suite are run against real PostgreSQL
- WHEN the resident E2E executes
- THEN all 9 existing scenarios remain unchanged and pass

### Requirement: Focused proof, rollback, and review bound

Focused mocked tests MUST mock `node:child_process` before importing the helper and prove protocol, naming, readiness, cleanup, and stop before the resident regression. The change MUST support independent rollback by deleting both support files and restoring the resident inline lifecycle. Total additions plus deletions, including untracked files, MUST remain below 400.

#### Scenario: Independent verification and size gate
- GIVEN the focused contract test and resident regression are run independently
- WHEN the changed-line total is measured from `HEAD`
- THEN both proofs are available, the total is under 400, and rollback requires no package/config/production/schema changes
