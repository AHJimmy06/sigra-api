# Guard gate authorization

Every access validation requires an active `GUARD` account and a persisted gate authorization. A GUARD role, JWT claim, account creation, or development seed is not a grant. New and existing users start denied.

## Grant or revoke access

An active `ADMIN` grants or revokes permission through:

```http
PATCH /api/access/guards/{guardId}/gate-authorization
Authorization: Bearer <admin-token>
Content-Type: application/json

{"authorized": true}
```

Set `authorized` to `false` to revoke. The target must exist and have the `GUARD` role. Grants to inactive guards are rejected; revocation remains allowed. An unchanged value is idempotent and creates no audit event. A successful state change and its audit record commit atomically.

The response is `{ "id": "<guard-id>", "authorized": true }`. Each state transition is recorded in `audit_logs` as `GUARD_GATE_AUTHORIZATION_GRANTED` or `GUARD_GATE_AUTHORIZATION_REVOKED`, with the acting ADMIN, target user, source IP, and authorization transition in metadata (`from` and `to`).

## Validation behavior

`POST /api/access/validate` checks the persisted authorization for every request; changing a grant takes effect for already-issued tokens. An active GUARD without authorization receives `403 Forbidden`. Inactive accounts remain rejected by JWT authentication with `401 Unauthorized`. Other access routes and TOTP validation policy are unchanged.

## Operational checklist

1. Create or identify an active GUARD account.
2. Authenticate as an active ADMIN and grant authorization only after the operational approval process.
3. Revoke authorization immediately when gate access is no longer required; no token rotation is needed.
4. Review the audit log for the matching grant or revoke event.
