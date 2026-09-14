# Design: Phase 3B API Announcement Administration

## Delivered Design

Phase 3B keeps Phase 3A schema/entity/migration ownership unchanged. It adds an
allowlisted snapshot mapper, a strict PATCH pipe, and a transaction-bound locked
state machine. A reusable disposable PostgreSQL/Nest HTTP harness supplies the
system proof. 3C synchronization, 3D OpenAPI proof, and 3E Web work remain
excluded.

## Verified Delivery Record

- **3B.1:** `9afc8ffda2224de7f7b514908622769fa789b647` to
  `b4402ed203bd3eb921365cce612d49a4bc4590ec`; 702 lines. See the exact
  rollback inventory in `tasks.md`.
- **3B.2:** `b4402ed203bd3eb921365cce612d49a4bc4590ec` to
  `52557e192657562df35a22202a6ab9b877e6f8ed`; 387 lines. See `tasks.md`.
- **3B.3:** `52557e192657562df35a22202a6ab9b877e6f8ed` to
  `a9189e79036ce9e052d9d9aaf862a75b72c28f22`; 155 lines. See `tasks.md`.
- **3B.4:** `a9189e79036ce9e052d9d9aaf862a75b72c28f22` to
  `ed13aed57e027422d86755df08bc0ec04caf0c7d`; 1,080 lines. See `tasks.md`.

## Review Decision

Original planning forecast: 1,050–1,400 changed lines. Final observed range:
2,120 changed lines (1,975 additions + 145 deletions). The maintainer approved
one PR with `size:exception`; no chained PR was created. The 400-line budget
constrained review planning, not code or test quality.

## Proof Boundary

Static Jest inventory proves 3B.1 GREEN has mapper 2 + controller 2 + service
3 = 7 tests, and 3B.2 GREEN has pipe 3 + service 5 = 8 tests. The archived-
detail GET proof remains in `test/announcement-administration-core.e2e-spec.ts`.

Next: `sdd-verify`.
