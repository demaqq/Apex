# Security

Northstar CareOS handles patient information. No system is unbreakable; the aim is defence in depth, so that a
single mistake or weakness does not expose patient data. This file describes what the application does today and
what a production deployment must add.

## In the application (browser)

| Protection | What it does |
|---|---|
| Encryption at rest | Hospital data saved in the browser is encrypted with AES-GCM (256-bit). The key is generated on the device, marked non-extractable and kept in IndexedDB, so a copy of the saved data cannot be read elsewhere (`src/lib/secureStore.ts`). |
| Sign-in lockout | After a configurable number of failed attempts (default 5) an account locks for 1 minute, doubling each time up to 30 minutes (`src/lib/security.ts`). |
| Idle screen lock | After a configurable idle time (default 10 minutes) the screen locks and hides patient information until the access key is entered again. |
| Session lifetime | Sessions end after a configurable number of hours (default 12), whatever the activity. |
| Step-up re-authentication | Exports (census, patient summaries, the security log) and emergency (break-glass) access ask for the access key again. |
| Least privilege | Each role sees only its pages. Clinicians see only patients linked to their department (assignment, OPD, consultation, comorbidity, theatre list) unless they use logged, time-limited emergency access. Administrators and the platform super admin cannot open patient records. Privileges are checked in the data layer as well as the screens. |
| Tamper-evident security log | Sign-ins, failures, lockouts, screen locks, re-authentication, exports, emergency access and policy changes are logged; each entry includes a SHA-256 hash of the previous one, so edits or deletions are detected (Administration → Security → Verify integrity). |
| Export controls | Every file export is logged with the user's name, exported patient records carry a confidentiality watermark, and spreadsheet exports are protected against formula injection. |
| Content Security Policy | Production builds allow scripts only from the application itself (no inline or third-party scripts), no plugins, and fonts only from Google Fonts. |
| Safe rendering | React escapes all text; the one generated HTML document (printed request form) escapes every value and is previewed in a sandboxed frame. No `innerHTML` or `eval`. |
| Referrer policy | `no-referrer`, so URLs are never leaked to other sites. |

Settings live under **Administration → Security**.

## Required before real patient data (server)

The demo runs entirely in the browser with a shared demo access key. A production deployment must add:

1. **Identity** — a personal account per user, strong passwords or single sign-on, multi-factor authentication, credentials hashed with a modern algorithm (Argon2id or bcrypt) on the server.
2. **Server-side authorization** — every read and write checked on the server against role, department scope and break-glass rules. The browser is never trusted.
3. **Transport and storage** — HTTPS only with HSTS, security headers sent by the server (CSP, `frame-ancestors 'none'`, `X-Content-Type-Options`, `Permissions-Policy`), an encrypted database and encrypted backups, keys in a managed key service, data separated per client (tenant).
4. **Audit and monitoring** — central, append-only audit logs on the server, alerting on unusual access (mass record views, out-of-hours exports), an incident-response plan, tested backups and restore.
5. **Assurance** — independent penetration testing, dependency and container scanning in CI, secure code review, staff training, and compliance with Ethiopia's personal data protection law and relevant health-data standards.

## Reporting a vulnerability

Please report suspected vulnerabilities privately to the maintainers rather than opening a public issue.
