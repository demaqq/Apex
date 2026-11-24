# Payments and SMS server

The app is a browser app; anything that needs a secret key runs here instead. `server/router.ts` is a
standard `Request → Response` handler used by:

- **Vercel** — the files in `/api` are Vercel Functions (deploy the repo as is; set the variables below in
  Project → Settings → Environment Variables).
- **Local development** — `npm run dev` serves `/api/*` from the same router and reads `.env.local`.

If no API answers (for example the static demo), the patient portal runs in **demo mode**: nothing is charged and
SMS are only recorded in the log.

## Payments

| Variable | |
|---|---|
| `CHAPA_SECRET_KEY` | Chapa secret key (`CHASECK-…`; `CHASECK_TEST-…` for test mode). Patients pay with telebirr, CBE Birr, M-Pesa, Amole or a card on Chapa's hosted page. |
| `STRIPE_SECRET_KEY` | Alternative: Stripe Checkout for international cards. |
| `PAYMENT_PROVIDER` | Optional: `chapa`, `stripe` or `sandbox` (a local stand-in checkout for development and tests — never in production). |
| `PAYMENT_CURRENCY` | Default `ETB`. |
| `TELEHEALTH_PRICES` | Optional JSON overriding the server's price list, e.g. `{"SV-15":{"name":"On-demand video visit","price":300}}`. The server always charges its own price, never one sent by a browser. |

Flow: the portal calls `POST /api/payments/checkout` → redirects to the provider → the provider returns the
patient to `/care?paid=<reference>` → the portal calls `GET /api/payments/verify`, which asks the provider directly.
The visit or message is created only when the provider reports the payment as successful for the right amount.

## SMS

| Variable | |
|---|---|
| `AFROMESSAGE_TOKEN`, `AFROMESSAGE_IDENTIFIER_ID`, `AFROMESSAGE_SENDER` | AfroMessage (Ethiopia). |
| `AFRICASTALKING_USERNAME`, `AFRICASTALKING_API_KEY`, `AFRICASTALKING_SENDER_ID` | Africa's Talking (`sandbox` username uses their sandbox). |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` or `TWILIO_MESSAGING_SERVICE_SID` | Twilio. |
| `SMS_PROVIDER` | Optional: pick one when several are configured, or `log` to print messages to the server log. |
| `SMS_ALLOWED_PREFIXES` | Country codes that may receive SMS, default `+251`. |
| `SMS_LIMIT_PER_NUMBER`, `SMS_LIMIT_PER_IP` | Hourly limits, default 6 per number and 40 per IP address. |

Only fixed templates can be sent (booking, queue, doctor ready, reminder, reply, cancellation, summary, test), with
rate limits per number and per IP address.

## Security

- `ALLOWED_ORIGINS` — comma-separated origins of the app if it is served from a different domain than the API.
  Browser requests from any other site are refused. Set `VITE_API_BASE` in the app build when the API is elsewhere.
- Keys live only in server environment variables; the browser sees which provider is active, never a key.
- Rate limits are per server instance. In production, put the API behind a shared limiter (e.g. Vercel Firewall).

## Still to do for production

- **Patient sign-in on the server.** Today the portal verifies the patient in the browser (hospital number + phone
  digits) and the record lives in the browser. Production needs the shared database and server-side sessions, so the
  SMS endpoint only texts the signed-in patient's own number.
- **Scheduled reminders.** Reminders are sent while a staff member has the app open. With the shared database, move
  them to a scheduled job (Vercel Cron) so they go out even when nobody is signed in.
- **Refunds.** Cancellations mark the refund due; issue it in the Chapa or Stripe dashboard.
