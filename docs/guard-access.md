# Guard visitor arrivals

Administrators create guard accounts with POST /api/access/guards and list them with GET /api/access/guards. New accounts are active but unauthorized. Use the existing PATCH /api/access/guards/:id/gate-authorization to grant or revoke gate access; guards cannot grant themselves permissions.

## Confirm an arrival

1. An authorized guard sends `{qrPayload}` to POST /api/access/preview. The response contains only residentId, residentName, unitCode and validUntil. Preview records no access event.
2. Collect visitorName (trimmed, 1–120 characters), then POST /api/access/validate with the original qrPayload, a new clientEventId and direction ENTRY. Final submission rechecks the pass, active resident/unit and TOTP. Existing clients may omit visitorName.
3. Retry the exact same request with the same clientEventId after network uncertainty. Changing visitorName or another validation field requires a new event ID. Legacy omitted-field retries retain their original fingerprint.
4. Residents read GET /api/access/arrivals: at most 50 of their own successful ENTRY events, newest first with ID tie-breaking. Legacy names and removed units may be null. Denials and exits are excluded.

## Deployment

Apply migration AddVisitorName1724600012000 before deploying the updated API. It adds a nullable visitor_name column without rewriting existing records. Rolling back that migration drops collected names; back up before rollback. No live migration is performed by this change.

Arrival banners and feeds update while applications are in the foreground. This is not background push delivery and does not promise notifications when an application is closed.
