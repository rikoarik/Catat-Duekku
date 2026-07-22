# Error Catalog — Catat Duekku API v1

All errors use the same envelope:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request validation failed.",
    "details": [{ "field": "amount", "reason": "must be greater than 0" }]
  },
  "meta": { "request_id": "01J2XK6YSPB3MZ0K2C2RCB7H4F" }
}
```

`code` is stable and client-actionable. `message` is safe for display but may be localized by the client. `details` is always an array and must not contain SQL, stack traces, provider payloads, JWT claims, secrets, receipt contents, or another user's identifiers. `request_id` is safe to include in support reports.

## Status rules

- `400`: malformed protocol/JSON, not domain validation.
- `401`: absent, invalid, expired, or unacceptable Supabase JWT.
- `404`: owned resource/reference unavailable; absent and foreign-owned are intentionally indistinguishable.
- `409`: uniqueness, idempotency, or state conflict.
- `412`: optimistic concurrency precondition failed.
- `413`: upload/request too large.
- `415`: unsupported media type.
- `422`: syntactically valid request with invalid fields or unsupported value.
- `429`: per-user/routing limit exceeded; include `Retry-After` seconds.
- `500`: unexpected server fault.
- `502`: configured upstream failed and no valid fallback exists.
- `503`: API capability/dependency unavailable; include `Retry-After` when known.

## Catalog

| HTTP | Stable code | Applies | Meaning / client action | Retry |
|---:|---|---|---|---|
| 400 | `INVALID_JSON` | JSON writes | Body is malformed JSON or not a JSON object. Fix request. | No |
| 400 | `INVALID_REQUEST` | all | Invalid header/path/protocol shape not attributable to a field. Fix request. | No |
| 401 | `AUTHENTICATION_REQUIRED` | all | Bearer token missing. Obtain Supabase session. | After auth |
| 401 | `AUTHENTICATION_INVALID` | all | JWT invalid, expired, wrong issuer/audience, or unverifiable. Refresh/re-authenticate once. | Once after refresh |
| 404 | `RESOURCE_NOT_FOUND` | references | Resource does not exist, is deleted, or is not caller-owned. | No |
| 404 | `ACCOUNT_NOT_FOUND` | transaction create | Account unavailable to caller. Refresh accounts/select another. | No |
| 404 | `CATEGORY_NOT_FOUND` | transaction create | Category unavailable to caller. Refresh categories/select another. | No |
| 409 | `RESOURCE_CONFLICT` | writes/reset | Current state prevents operation or unique invariant conflicts. Refresh state. | No automatic retry |
| 409 | `ACCOUNT_NAME_EXISTS` | account create | Active account with same case-insensitive name exists. | No |
| 409 | `CATEGORY_NAME_EXISTS` | category create | Active category with same name/type exists. | No |
| 409 | `IDEMPOTENCY_KEY_REUSED` | POST | Same key was used with a different canonical request. Generate a new key only for a genuinely new action. | No |
| 412 | `VERSION_CONFLICT` | profile/budget | `If-Match` version is stale or create-only precondition failed. Refetch and reconcile. | After refetch |
| 413 | `PAYLOAD_TOO_LARGE` | receipt activation/general | Body exceeds configured limit. Resize/reduce. Receipt endpoint remains blocked regardless. | No |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | writes/receipt activation | Content type or verified image format unsupported. | No |
| 422 | `VALIDATION_FAILED` | all requests with input | One or more fields fail schema rules. `details[].field` uses JSON path/query/header name. | No |
| 422 | `RESET_CONFIRMATION_REQUIRED` | reset | Body does not contain exact `{"confirmation":"RESET"}`. Ask user again. | No |
| 422 | `INVALID_INSTALLMENT_PLAN` | debt create | Tenor, paid installments, dates, or computed amounts are inconsistent. | No |
| 422 | `UNSUPPORTED_ANALYTICS_PERIOD` | analytics | `period` is not `7m`. | No |
| 429 | `RATE_LIMITED` | general/sync | Caller exceeded route limit. Respect `Retry-After`. | Yes, delayed |
| 429 | `PARSER_RATE_LIMITED` | parser | Parser quota exceeded. Keep/use local parser or retry after indicated delay. | Yes, delayed |
| 500 | `INTERNAL_ERROR` | all | Unexpected fault. Show generic failure and retain unsaved user input. | Safe GET; keyed POST only |
| 502 | `PARSER_PROVIDER_FAILED` | parser | AI fallback failed and no valid local parse could be returned. Allow manual entry. | Optional delayed |
| 503 | `SERVICE_UNAVAILABLE` | all | Database/function/dependency temporarily unavailable. Retain local input. | Safe GET; keyed write only |
| 503 | `RECEIPT_EXTRACTION_BLOCKED` | receipt extraction | Provider/private storage/upload lifecycle are not configured. Use manual transaction form; do not retry automatically. | No |

## Validation detail examples

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request validation failed.",
    "details": [
      { "field": "name", "reason": "must contain 1 to 100 characters after trimming" },
      { "field": "target_amount", "reason": "must be a positive integer rupiah amount" }
    ]
  },
  "meta": { "request_id": "01J2XK6YSPB3MZ0K2C2RCB7H4F" }
}
```

## Security behavior

- Do not return `403` for ownership misses; return the same `404` used for absent rows.
- Do not reveal whether another user owns a duplicate/reference.
- Authentication messages do not disclose JWT parsing internals.
- Rate-limit keys are based on verified user identity plus route, not client-supplied user IDs.
- Reset failures must roll back entirely and return one error; partial deletion is forbidden.
- Transaction failures must roll back both transaction insert and account balance update.

## Client retry policy

| Operation class | Automatic retry rule |
|---|---|
| GET | Retry transient `500/502/503` with bounded exponential backoff and jitter. |
| POST with `Idempotency-Key` | Retry transient failure with the same key and byte-equivalent semantic body. |
| POST without key | Do not retry automatically. |
| PATCH/PUT with `If-Match` | On `412`, refetch; never blindly retry stale content. |
| DELETE reset | Retry only after an unambiguous transport failure and renewed user intent; never after a normal error response. |
| Receipt extraction blocked | Never retry; switch to editable manual entry. |

## Observability

Every response, including auth and validation failures, includes `meta.request_id`. Servers should record operation ID, request ID, authenticated subject hash, status, stable error code, and latency. They must not log authorization headers, parser input, profile names/emails, notes, descriptions, receipt bytes, or provider responses.
