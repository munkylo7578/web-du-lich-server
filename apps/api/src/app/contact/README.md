# Journey enquiry email API

**POST /api/v1/contact/journey** sends a notification to the existing configured
contact recipient through Brevo. The original contact endpoint is unchanged.
This is an enquiry, not a ticket reservation or payment endpoint.

## Request

Headers: Content-Type: application/json and x-api-key: your server-side API key.
Do not expose the API key in public frontend code; call this API from your server.

```json
{
  "name": "Nguyễn Văn An",
  "email": "visitor@example.com",
  "phoneNumber": "+84 912 345 678",
  "numberOfTickets": 4,
  "message": "Please send me the itinerary and price.",
  "locale": "en"
}
```

All five form fields are optional, including for an empty request body object.

| Field | Accepted value |
| --- | --- |
| name | String, trimmed, maximum 200 characters |
| email | Valid email, trimmed, maximum 320 characters |
| phoneNumber | String, trimmed, maximum 50 characters |
| numberOfTickets | Integer from 0 to 100000, or a decimal digit string such as "4" |
| message | String, trimmed, maximum 5000 characters |
| locale | Optional "vi" or "en"; omitted means Vietnamese |

Blank strings and null form-field values are treated as not provided. A null or
blank locale is invalid. Unknown fields, booleans/arrays/objects as ticket counts,
fractional/negative counts, and counts outside the range are rejected.

The email uses “Phone number” and “Number of ticket” in English, or “Số điện thoại”
and “Số lượng vé” in Vietnamese. Missing values have localized fallbacks. HTML is
escaped, and a plain-text alternative is included. If an email is supplied, it is
used as reply-to, not as the notification recipient.

## Response

HTTP 200 means the email provider accepted the send request; it does not guarantee
inbox delivery.

```json
{
  "success": true,
  "data": { "sent": true }
}
```

Errors use the existing API error envelope: 400 for invalid input, 401 for an
invalid/missing API key, 429 for rate limiting, 500 for invalid recipient
configuration, and 503 for provider failures or timeouts.

## Configuration

Reuse the existing BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME, and
CONTACT_RECIPIENT_SETTING_KEY environment variables. The sender must be authorized
in Brevo. The referenced site setting must be text/plain_text and contain a single
valid email address, without HTML. The Vietnamese translation is preferred, with
the first nonblank translation as fallback; request language does not change the
recipient. No new environment variable or database migration is needed.

The endpoint inherits the application's API-key and rate-limit guards. Swagger
documentation includes the request and response when API documentation is enabled.
