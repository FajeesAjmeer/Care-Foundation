# Twin Care Foundation — platform v1.1

A runnable, self-hosted medical assistance coordination platform based on your original HTML mockup. The original Inter typography, colours, spacing, card styles, responsive breakpoints and dark-mode styles are retained. Public pages show real saved records instead of sample patients, fake balances or invented credentials.

This delivery is **source code and deployment setup**, not a newly launched public website. The earlier ChatGPT-hosted link is still the original demo. No production patient data or admin passwords are included.

## Separate public and administration portals

- Public website: `http://localhost:8000/` — patients, families, supporters and volunteers.
- Admin workspace: `http://localhost:8000/admin` — dedicated staff sign-in and sidebar; no patient forms or public navigation.
- The public website no longer shows an Admin menu. The old `/#admin` URL displays a link to the new workspace.
- Administrator sign-in uses a separate `/api/admin/login` endpoint that rejects member accounts. Backend role checks remain mandatory on all privileged operations. Public signup cannot grant admin access.
- Both portals share the same database and same-origin session cookie. They are separate interfaces, not separate deployments or independent simultaneous browser logins. Use separate browser profiles/incognito windows when testing a patient and an admin at the same time.
- Existing administrator credentials and patient records still work; no database migration is required. Server-owner account provisioning remains in `manage.py`; this update does not add a separate owner role or browser-based staff invitations.

See `UPDATE-TA.md` before replacing files in an existing installation.

## Included

- Member registration, password login, 12-hour cookie sessions, logout and password changes.
- Persistent multi-step applications, applicant/guardian NIC, public alias, age and separate verification/publication/contact consent.
- Three mandatory private medical files, 5 MB each (PDF/PNG/JPEG).
- Applicant status tracking and private document downloads.
- Server-enforced admin roles, checklists, rejection reasons, audit events and two distinct approvals before publication. Admins cannot approve their own applications.
- Checklist changes reset approvals. Concurrent duplicate approvals cannot publish a case.
- Public case search and filters; direct case links; authenticated WhatsApp/call contact links.
- Fraud reports and private evidence. A report does not automatically remove a case; admins investigate, dismiss or suspend. Restoring a suspended case requires two new approvals.
- Persistent volunteer registrations, admin-managed success stories, and an append-only confirmed direct-support ledger with duplicate receipt protection.
- Responsive frontend, empty states, privacy notice, Docker/Caddy deployment, backup and admin CLI.

Twin Care does not collect, hold or process funds. The mockup's fake foundation bank account has been replaced by a direct assistance explanation. NGO registration and independent-audit claims were removed because no evidence was supplied. These are intentional content changes; the visual design system is retained.

## Quick local run — Windows, macOS or Linux

Install Python 3.12 or newer. Extract this ZIP, open a terminal in `twin-care-platform`, and run:

```sh
python server.py
```

Open **http://localhost:8000** (use this exact hostname, not `127.0.0.1`, because request origin checking is enabled). No package installation is needed for local development. The development server is loopback-only and is not the public production server.

In a second terminal, create **two different real administrator accounts**:

```sh
python manage.py create-admin first-admin@example.org --name "First Admin"
python manage.py create-admin second-admin@example.org --name "Second Admin"
```

Replace the example emails/names. Each command securely prompts for a password of at least 12 characters. Never share one admin account between both reviewers. A public signup always creates a member; it can never grant itself admin access.

1. Register a member account in the browser.
2. Submit an application with three non-sensitive test documents.
3. Open `/admin`, log in as admin one, start review, independently verify details and tick all four checks.
4. Approve once. The case is still not public.
5. Log in as admin two and approve. The public case is now visible.
6. Log in as a supporter to open WhatsApp or the dialler.

SQLite creates `data/twin-care.sqlite3`. Uploaded files are stored as private BLOBs inside that database; they are not web assets. Restarting the server preserves all records. Use synthetic test data until the deployment is configured for real medical records.

## Publish after selecting hosting

Choose a host supporting Docker Compose, a persistent disk, a domain, and inbound ports 80/443. The supplied setup uses a Python WSGI server, SQLite on one persistent volume, and Caddy HTTPS. It is **not** a static-upload package: Vercel static hosting, GitHub Pages and a basic file-only cPanel plan cannot run this backend unchanged. A single-server deployment is the supported topology; do not run separate replicas with separate databases.

On a Linux server with Docker Engine + Compose installed:

1. Upload/extract this project.
2. Point the domain's DNS A/AAAA records at the server. Remove an AAAA record if IPv6 is not configured.
3. Copy `.env.example` to `.env`. Set `DOMAIN` to your real hostname (without `https://`) and `CONTACT_EMAIL` to your monitored foundation mailbox.
4. Start the containers:

```sh
docker compose up -d --build
docker compose exec app python manage.py create-admin first-admin@example.org --name "First Admin"
docker compose exec app python manage.py create-admin second-admin@example.org --name "Second Admin"
```

5. Open `https://YOUR-DOMAIN`, create a test member and run the two-admin workflow above.
6. Check operation:

```sh
docker compose logs --tail=100 app proxy
```

Caddy obtains HTTPS for the configured domain. Only the proxy exposes public ports. The backend lives on the internal Docker network. Do not expose port 8000 directly. `TRUST_PROXY=1` is safe only behind this trusted proxy: Caddy overwrites `X-Real-IP`; the app uses it for authentication rate limits. When deploying without this proxy, leave `TRUST_PROXY` unset and configure trusted client-IP handling explicitly.

Environment variables:

| Variable | Purpose |
| --- | --- |
| `APP_ENV=production` | Enforces an HTTPS origin and Secure cookies. |
| `APP_ORIGIN=https://care.yourdomain.org` | Exact browser origin; no trailing path. Compose derives this from `DOMAIN`. |
| `CONTACT_EMAIL` | Real team contact in the privacy/recovery UI. |
| `DATA_DIR` | Persistent SQLite/document directory. Compose uses `/data`. |
| `TRUST_PROXY=1` | Trust the proxy-overwritten `X-Real-IP`, only with the supplied private proxy topology. |

If using a non-Docker Python host, install `requirements.txt`, configure those variables and persistent storage, and start `gunicorn --bind 127.0.0.1:8000 --workers 2 --threads 2 server:application` behind an HTTPS reverse proxy. Gunicorn is the production WSGI server; its official deployment documentation is at https://gunicorn.org/deploy/ .

## Backups and recovery

The database includes medical documents, identity data, reports and password hashes. Store it on encrypted host storage; use encrypted off-site backups with restricted access. File permissions alone are not encryption. The application does not implement its own encryption-at-rest layer.

Create a consistent online backup:

```sh
docker compose exec app python manage.py backup /data/backup-2026-10-15.sqlite3
docker compose cp app:/data/backup-2026-10-15.sqlite3 ./backup-2026-10-15.sqlite3
```

Choose a new filename each time. Encrypt and move the downloaded backup to your backup service; remove the staging backup from `/data` after confirming transfer, so private old data is not retained indefinitely. Schedule backups using your host's scheduler. This package does not configure an external backup service.

To restore: stop the app, preserve the current data directory, replace `twin-care.sqlite3` with the verified backup, remove obsolete `-wal`/`-shm` files from the stopped database, restore ownership to container UID 10001 and permissions 0600, then restart the app. Test restoration in a separate environment first.

## Account and data operations

After independently checking the requester's identity, the server owner can reset a forgotten password (all sessions for that user are invalidated):

```sh
python manage.py reset-password person@example.org
python manage.py revoke-admin former-admin@example.org
```

Use `docker compose exec app` before these commands in production. There are no email verification, SMTP notifications, self-service email password resets or MFA in this release. These require choosing and configuring identity/email services. Email login is not proof of identity; the admin review must check identity independently.

For a withdrawal of publication/contact consent, suspend the case immediately in the Admin dashboard. To permanently remove an application and its files/reports/ledger after the owner has confirmed the request and retention requirements:

```sh
python manage.py delete-application CASE_ID --confirm CASE_ID
```

This deletes the active records, not old backups. Define a retention/backup-expiry policy before real patient intake. Correction of already-submitted patient information is currently handled by rejecting the original application with a reason and asking for a corrected new application, rather than silently editing reviewed records. Admin receipt entries are append-only in this version; financial corrections need an owner-reviewed maintenance process, not duplicate entries.

## Validation included

```sh
python -m unittest discover -s tests -v
node --check public/app.js
node tests/frontend-smoke.cjs
```

The backend tests exercise privacy, CSRF, roles, duplicate/concurrent approvals, re-review, consent, upload type checks, direct support, password changes, volunteers and stories. The JS smoke test executes render functions against a DOM stub; it does not replace browser testing.

## Launch status and remaining verification

- Implemented and locally tested: application/API workflows and frontend render paths.
- Not performed here: browser screenshot/responsive/keyboard testing, Docker image execution, real DNS/TLS provisioning, email delivery or testing on your chosen host.
- Uploads are signature/type/size checked and served only as authenticated downloads. Malware scanning is not integrated; an operator should scan untrusted files before opening them.
- The privacy text is a factual implementation notice, not a legal assessment. Before accepting real medical records, the foundation must provide its actual contact identity, retention policy and operational verification procedure.
- No sample patients, stories, donation totals, default admin passwords or live personal records are seeded.

## Project map

- `public/` — original visual system, connected frontend and pages.
- `server.py` — WSGI API, authorization, validation, SQLite schema and private file access.
- `manage.py` — administrator creation, recovery, revocation, backups and approved application deletion.
- `Dockerfile`, `compose.yaml`, `Caddyfile`, `.env.example` — deployment configuration.
- `tests/` — backend integration and frontend render smoke tests.
- `START-HERE-TA.md` — Tamil quick start and handoff notes.
