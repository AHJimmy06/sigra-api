# Tasks: Phase 3 API Announcement Communication

## Review Workload Forecast

Estimate: 2,650–4,000 lines. One PR, `exception-ok`; approved `size:exception`; chained PRs: No.

Decision needed before apply: No
Chained PRs recommended: No
400-line budget risk: High

Task count: 3C=8, 3D=4, 3E=4, 3F=2, 3G=2, closeout=2, total=22.
Protect archived 3A/3B: read-only; do not rewrite `openspec/changes/archive/2026-09-13-phase-3a-api-announcement-schema-author/` or `openspec/changes/archive/2026-09-14-phase-3b-api-announcement-administration/`; do not begin source work before 3C.1.

## 3C: Additive change-feed schema, then writer

**Commit policy:** execute every RED → GREEN cycle in the working tree and make
one final Phase 3C conventional commit only after all checks pass. Preserve
test-first command/results receipts with the completed work unit.

- [x] 3C.1 RED: assert SQL, entities, registration, and metadata in `src/migrations/1724600010000-AddAnnouncementChangeFeed.ts`, `src/migrations/1724600010000-AddAnnouncementChangeFeed.spec.ts`, `src/announcements/announcement-change.entity.ts`, `src/announcements/announcement-change-clock.entity.ts`, `src/config/typeorm-metadata.spec.ts`, `src/config/typeorm.datasource.ts`, `src/announcements/announcements.module.ts`; run `npm test -- --runInBand --runTestsByPath src/migrations/1724600010000-AddAnnouncementChangeFeed.spec.ts src/config/typeorm-metadata.spec.ts`.
- [x] 3C.2 GREEN: implement additive clock/change tables, uint64/check/FK/index contracts and exact registrations; run `npm test -- --runInBand --runTestsByPath src/migrations/1724600010000-AddAnnouncementChangeFeed.spec.ts src/config/typeorm-metadata.spec.ts`.
- [x] 3C.3 RED: add PostgreSQL up/down/up, parity, preservation, deterministic backfill, and clock proof in `test/announcement-change-feed-migration.e2e-spec.ts`; run `npm run test:e2e -- --runInBand --runTestsByPath test/announcement-change-feed-migration.e2e-spec.ts`.
- [x] 3C.4 GREEN: prove up/down/up, parity, backfill, preservation, and removal of only 3C history with `npm run test:e2e -- --runInBand --runTestsByPath test/announcement-change-feed-migration.e2e-spec.ts`.
- Rollback boundary for 3C.1–3C.4 schema/E2E pair: `src/migrations/1724600010000-AddAnnouncementChangeFeed.ts`, `src/migrations/1724600010000-AddAnnouncementChangeFeed.spec.ts`, `src/announcements/announcement-change.entity.ts`, `src/announcements/announcement-change-clock.entity.ts`, `src/config/typeorm-metadata.spec.ts`, `src/config/typeorm.datasource.ts`, `src/announcements/announcements.module.ts`, `test/announcement-change-feed-migration.e2e-spec.ts`; down removes only 3C tables/history and preserves 3A/3B data.
- [x] 3C.5 RED: add one representative lifecycle unit test for the transaction-bound event-writing seam in `src/announcements/announcement-lifecycle.service.spec.ts`; first run the seven existing `src/announcements/announcements.service.spec.ts` tests as the Safety Net, then run the new lifecycle test.
- [x] 3C.6 GREEN: augment `src/announcements/announcements.service.ts` after its transaction-bound audit call with locked clock/event writes; `src/audit/audit.service.ts` remains unchanged. Prove the one lifecycle unit test and the combined Safety Net (seven existing service tests plus one new lifecycle test).
- [x] 3C.7 RED: add the test-first PostgreSQL lifecycle E2E cycle in `test/announcement-lifecycle.e2e-spec.ts`; its six tests triangulate create, edit, publish, withdraw, archive, no-op, rollback, concurrency, ordering, and event/audit cardinality, and fail before production event writes exist.
- [x] 3C.8 GREEN: prove all 3C lifecycle semantics with `npm run test:e2e -- --runInBand --runTestsByPath test/announcement-lifecycle.e2e-spec.ts` (6 tests); rollback `src/announcements/announcements.service.ts`, `src/announcements/announcement-lifecycle.service.spec.ts`, `test/announcement-lifecycle.e2e-spec.ts`.

## 3D: Cursor/feed internals

- [ ] 3D.1 RED: test paging, validation, replay, ordering, repeatable-read, and clock behavior in `src/announcements/announcement-cursor.spec.ts` and `src/announcements/resident-announcement-feed.service.spec.ts`; run `npm test -- --runInBand --runTestsByPath src/announcements/announcement-cursor.spec.ts src/announcements/resident-announcement-feed.service.spec.ts`.
- [ ] 3D.2 GREEN: create `src/announcements/announcement-cursor.ts` and `src/announcements/resident-announcement-feed.service.ts`; run `npm test -- --runInBand --runTestsByPath src/announcements/announcement-cursor.spec.ts src/announcements/resident-announcement-feed.service.spec.ts`.
- [ ] 3D.3 RED: add concurrency proof in `test/announcement-feed-concurrency.e2e-spec.ts`; run `npm run test:e2e -- --runInBand --runTestsByPath test/announcement-feed-concurrency.e2e-spec.ts`.
- [ ] 3D.4 GREEN: run `npm run test:e2e -- --runInBand --runTestsByPath test/announcement-feed-concurrency.e2e-spec.ts`; rollback `src/announcements/announcement-cursor.ts`, `src/announcements/announcement-cursor.spec.ts`, `src/announcements/resident-announcement-feed.service.ts`, `src/announcements/resident-announcement-feed.service.spec.ts`, `test/announcement-feed-concurrency.e2e-spec.ts`.

## 3E: RESIDENT route wiring

- [ ] 3E.1 RED: test RESIDENT auth, invalid inputs, allowlists, and pagination in `src/announcements/resident-announcement.dto.spec.ts` and `src/announcements/resident-announcements.controller.spec.ts`; run `npm test -- --runInBand --runTestsByPath src/announcements/resident-announcement.dto.spec.ts src/announcements/resident-announcements.controller.spec.ts`.
- [ ] 3E.2 GREEN: create DTO/controller and wire `src/announcements/announcements.module.ts`; run `npm test -- --runInBand --runTestsByPath src/announcements/resident-announcement.dto.spec.ts src/announcements/resident-announcements.controller.spec.ts`.
- [ ] 3E.3 RED: prove progression/authorization in `test/resident-announcement-sync.e2e-spec.ts`; run `npm run test:e2e -- --runInBand --runTestsByPath test/resident-announcement-sync.e2e-spec.ts`.
- [ ] 3E.4 GREEN: run `npm run test:e2e -- --runInBand --runTestsByPath test/resident-announcement-sync.e2e-spec.ts`; rollback `src/announcements/resident-announcement.dto.ts`, `src/announcements/resident-announcement.dto.spec.ts`, `src/announcements/resident-announcements.controller.ts`, `src/announcements/resident-announcements.controller.spec.ts`, `src/announcements/announcements.module.ts`, `test/resident-announcement-sync.e2e-spec.ts`.

## 3F: ADMIN OpenAPI proof

- [ ] 3F.1 RED: extend `src/openapi/openapi-artifact.spec.ts` for ADMIN parity; run `npm test -- --runInBand --runTestsByPath src/openapi/openapi-artifact.spec.ts`.
- [ ] 3F.2 GREEN: update `src/announcements/announcement.dto.ts`, `src/announcements/announcements.controller.ts`, `src/openapi/generate-openapi.ts`; run `npm run openapi:generate`, `npm test -- --runInBand --runTestsByPath src/openapi/openapi-artifact.spec.ts`, `npm run openapi:check`; rollback `src/announcements/announcement.dto.ts`, `src/announcements/announcements.controller.ts`, `src/openapi/generate-openapi.ts`, `src/openapi/openapi-artifact.spec.ts`, `docs/openapi/v1.json`.

## 3G: RESIDENT OpenAPI proof and handoff

- [ ] 3G.1 RED: cover resident route, cursor, and allowlist parity in `src/openapi/openapi-artifact.spec.ts`; run `npm test -- --runInBand --runTestsByPath src/openapi/openapi-artifact.spec.ts`.
- [ ] 3G.2 GREEN: update `src/announcements/resident-announcements.controller.ts`, `src/announcements/resident-announcement.dto.ts`, `src/openapi/generate-openapi.ts`; regenerate/check `docs/openapi/v1.json`; run `npm run openapi:generate`, `npm test -- --runInBand --runTestsByPath src/openapi/openapi-artifact.spec.ts`, `npm run openapi:check`, `sha256sum docs/openapi/v1.json`; rollback `src/announcements/resident-announcements.controller.ts`, `src/announcements/resident-announcement.dto.ts`, `src/openapi/generate-openapi.ts`, `src/openapi/openapi-artifact.spec.ts`, `docs/openapi/v1.json`.

## Closeout (2 tasks)

- [ ] C.1 RED→GREEN: from repository root run `npm test -- --runInBand`, `npm run test:e2e -- --runInBand`, `npm run build`, `git diff --name-only -z f0a95ff..HEAD -- '*.ts' ':(exclude)openspec/changes/archive/**' | xargs -0 -r npx eslint`, `git diff --name-only -z f0a95ff..HEAD -- '*.ts' '*.json' '*.md' '*.yaml' ':(exclude)openspec/changes/archive/**' | xargs -0 -r npx prettier --check`, `npm run openapi:check`, `git diff --check f0a95ff..HEAD`, and `git diff --numstat f0a95ff..HEAD`; record the project lint baseline separately; include all 3C paths and verify archived 3A/3B paths (read-only) unchanged.
- [ ] C.2 GREEN: advance to `sdd-verify`; update checklist/archive/handoff. Order: 3C.1–3C.8 → 3D → 3E → 3F → 3G → closeout. Next task: **3D.1 RED**.
