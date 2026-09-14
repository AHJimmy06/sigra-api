# Source-Backed Research: Phase 3 API Announcement Change Feed

```yaml
schema: gentle-ai.sdd-research/v1
revision: 2
outcome: unselected
accessed_at: 2026-09-13
change: phase-3-api-announcement-communication
lane: resident-announcement-change-feed
scope:
  included:
    - sigra-api resident announcement synchronization contract
  excluded:
    - proposal, design, tasks, implementation, and testing
    - push notifications and delivery infrastructure
    - mobile UI and Web behavior beyond contract handoff
admission:
  requested_classes:
    - documentation
    - open-web
  requested_capability_declaration:
    schema: gentle-ai.sdd-research-capability/v1
    grants:
      documentation:
        - context7
      open-web:
        - webfetch
  observed_runtime_grants:
    documentation: []
    open-web: []
  admitted_classes: []
  denied_classes:
    - documentation
    - open-web
  undeclared_classes_used: []
  admission: denied
questions:
  - Opaque versioned cursor design and stable monotonic ordering.
  - Cursor pagination behavior under concurrent writes.
  - syncedAt and high-watermark semantics.
  - Page limit bounds.
  - Invalid cursor handling using the confirmed 400 CURSOR_INVALID product choice.
  - No cursor expiration during Phase 3.
  - Idempotent client consumption and withdrawal/archive tombstone semantics.
  - Reconciliation of roadmap publication-date ordering with incremental change-sequence ordering.
coverage:
  opaque_versioned_cursor: blocked_by_capability_admission
  stable_monotonic_ordering: blocked_by_capability_admission
  concurrent_write_pagination: blocked_by_capability_admission
  synced_at_high_watermark: blocked_by_capability_admission
  limit_bounds: blocked_by_capability_admission
  invalid_cursor_handling: product_choice_retained_evidence_not_evaluated
  cursor_expiration: product_choice_retained_evidence_not_evaluated
  idempotent_consumption: blocked_by_capability_admission
  tombstone_semantics: blocked_by_capability_admission
  publication_date_vs_change_sequence: blocked_by_capability_admission
```

## Executive Summary

Revision 2 records an optional, unselected research lane whose capability admission was denied. The supplied capability declaration requested Context7 documentation and WebFetch open-web access, while the authoritative runtime evidence grants observed by this executor were empty for both classes. No external source was accessed, and this revision emits no source-backed or validated claims.

The retained questions and confirmed product choices remain separate. This optional, unselected research lane is not a proposal-readiness blocker; the current state records `proposal_ready: true`.

## Sources

None admitted in revision 2.

## Validated Claims and Claim-to-Source Mapping

None emitted in revision 2 because all requested evidence classes were denied. No claim from revision 1 is reused.

## Contradictions, Uncertainty, and Freshness

- No source comparison, contradiction analysis, bounded excerpt collection, or freshness assessment was performed.
- All requested research questions remain unsupported in this revision.
- No cursor encoding, sequence allocator, transaction boundary, watermark algorithm, limit value, retry behavior, retention guarantee, or client reconciliation algorithm is inferred.
- The confirmed product choices below are inputs, not evidence and not validated claims.

## Retained Research Intent

The next admitted recovery must remain within one bounded lane: a single resident announcement change feed containing published upserts and withdrawal/archive tombstones. It must collect authoritative public evidence with URL, publisher, access date, and bounded excerpt, then map each validated claim to source identifiers for:

1. An opaque, versioned cursor whose ordering key is stable and monotonic.
2. Cursor pagination correctness when writes occur between page requests.
3. The precise meaning and capture boundary of `syncedAt` or an equivalent high watermark.
4. Defensible minimum, default, and maximum page limits.
5. Deterministic handling of malformed, unsupported-version, or otherwise invalid cursors while retaining the selected `400 CURSOR_INVALID` wire behavior.
6. Phase 3 operation without cursor expiration, including any retention or replay constraints established by evidence.
7. Idempotent client application of repeated upserts and tombstones, including withdrawal and terminal archive reconciliation.
8. Separation between resident presentation ordered by publication date and incremental synchronization ordered by change sequence.

## Non-Authoritative Confirmed Product Choices

These confirmed inputs are retained separately and are not presented as source evidence:

- One resident feed carries published upserts and withdrawal/archive tombstones.
- Invalid cursors return `400 CURSOR_INVALID`.
- Phase 3 cursors do not expire.
- `POST /api/announcements/:id/archive` is idempotent, terminal, and returns the resource with HTTP 200.
- Author responses use a profile plus a persisted historical snapshot; Web displays the author name only.
- Create-with-immediate-publication records distinct create and publish audit events.
- Concurrent announcement transitions use row locking.
- `publishedAt` records first publication and remains stable; edits preserve published state; immediate publication remains supported.
- Archived announcements are excluded by default and are read-only when explicitly listed.
- Push notifications and mobile UI are out of scope.

## Research Gate

Outcome is `unselected` after capability denial. Research remains available for a future, explicitly selected `sdd-research` execution whose authoritative runtime capability grants admit the requested evidence classes. That future execution must collect fresh sources and must not reuse claims from either capability-blocked revision; it is not required for the current proposal-ready state.
