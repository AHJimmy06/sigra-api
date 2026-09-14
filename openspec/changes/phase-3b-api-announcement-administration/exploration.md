## Exploration: Phase 3B API Announcement Administration

### Verified Starting Point

Phase 3A is present through `9afc8ffda2224de7f7b514908622769fa789b647`. Phase 3B required no schema or entity change and implemented the confirmed ADMIN contract without resident synchronization, OpenAPI proof, Web work, or umbrella edits.

### Actual Affected Test and Runtime Files

- `src/announcements/announcement.mapper.spec.ts` and `src/announcements/announcement.mapper.ts` — allowlisted snapshot projection proof and implementation.
- `src/announcements/announcements.controller.spec.ts` and `src/announcements/announcements.controller.ts` — ADMIN route and delegation proof/implementation.
- `src/announcements/announcements.service.spec.ts` and `src/announcements/announcements.service.ts` — read, mutation, and lifecycle proof/implementation.
- `src/announcements/announcement-patch.pipe.spec.ts` and `src/announcements/announcement-patch.pipe.ts` — strict PATCH classification proof/implementation.
- `test/announcement-administration-core.e2e-spec.ts`, `test/announcement-lifecycle.e2e-spec.ts`, and `test/support/announcement-administration-http-harness.ts` — real PostgreSQL/Nest proof.

The static evidence is the mapper, controller, service, and PATCH-pipe test inventory listed above.

### Observed Delivery Size

The original planning forecast was 1,050–1,400 changed lines. Final observed size is 2,120 changed lines (1,975 additions + 145 deletions): 3B.1 702, 3B.2 387, 3B.3 155, and 3B.4 1,080. One maintainer-approved `size:exception` PR remains the delivery decision; no chained PR was created.

### Conclusion

The recorded 19 scoped paths preserve Phase 3A ownership and exclude 3C, 3D, and 3E. Next: `sdd-verify`.
