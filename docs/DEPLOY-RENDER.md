# Deploying Subscrr to Render — single service, one URL

Everything (Express API + Next.js frontend + Payload CMS) runs in **one Node
process on one port** — you deploy **once**, get **one URL**, manage **one
dashboard service**. No separate frontend/backend services.

---

## How it works (30-second architecture)

```
                    Render Web Service (one)
   ┌──────────────────────────────────────────────────────┐
   │  node server.mjs          (one port: 10000 internally)│
   │                                                        │
   │  /api/*  /uploads/*   →  Express API (backend/dist)    │
   │  /*  /_next  /admin   →  Next.js + Payload CMS         │
   │  /api/payload  /graphql                                │
   └──────────────────────────────────────────────────────┘
             │
             ▼  persistent disk /opt/data (survives redeploys)
     subscrr.db · subscrr-content.db · uploads/ · media-uploads/
```

`server.mjs` mounts the built Express app first (its error handler only fires
on errors, so non-API requests fall through) and gives everything else to the
built Next.js app, which also hosts the Payload admin at `/admin`.

---

## Option A — Blueprint deploy (recommended)

1. **Push this repo to GitHub** (Render needs a Git remote).
2. Go to https://dashboard.render.com → **New → Blueprint**.
3. Select this repository. Render reads `render.yaml` and pre-fills
   everything: build command, start command, health check, disk, env vars.
4. Render will ask you to fill in the `sync: false` secrets (see list below).
5. Click **Apply**. First build takes ~5–8 min (Next build is the slow part).
6. Your app is live at `https://<service-name>.onrender.com`.

## Option B — Manual web service

1. **New → Web Service** → connect the repo.
2. Settings:
   - **Runtime:** Node
   - **Build Command:** `npm run build:render`
   - **Start Command:** `npm run start:all`
   - **Health Check Path:** `/api/health`
   - **Instance Type:** Starter or higher (needed for the persistent disk)
3. **Disks → Add disk:** mount path `/opt/data`, size 1 GB.
4. Add the environment variables below, then **Create Web Service**.

---

## Environment variables (Render → Environment tab)

### Required secrets

| Key | What | How to generate |
|---|---|---|
| `JWT_SECRET` | App auth token signing | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `PAYLOAD_SECRET` | CMS session encryption | same command |
| `ADMIN_PASSWORD` | App admin login (`admin@subscrr.app`) | any strong password (≥8 chars) |
| `PAYLOAD_ADMIN_PASSWORD` | CMS admin login (`admin@subscrr.local`) | any strong password |
| `FRONTEND_URL` | Your public URL | `https://<your-service>.onrender.com` (set after first deploy — Render shows the URL) |

### Set automatically by render.yaml (no action needed)

`NODE_ENV=production`, `DB_PATH=/opt/data/subscrr.db`,
`UPLOAD_DIR=/opt/data/uploads`, `PAYLOAD_DATABASE_URI=file:/opt/data/subscrr-content.db`,
`PAYLOAD_MEDIA_DIR=/opt/data/media-uploads`, `DATA_DIR=/opt/data`

### Optional integrations

| Key | Enables |
|---|---|
| `SMTP_HOST` `SMTP_PORT` `SMTP_USER` `SMTP_PASS` `EMAIL_FROM` | Real password-reset + alert emails (Gmail app password works) |
| `OPENAI_API_KEY` (+ optional `OPENAI_BASE_URL`, `OPENAI_MODEL`) | AI vision receipt scanning |
| `CORS_ORIGINS` | Only needed if you serve the frontend from a different origin |

---

## First-deploy checklist

1. **Wait for the build to finish** — the log should end with the unified
   server banner and `✅ Connected to SQLite database at /opt/data/subscrr.db`.
2. **Health check:** open `https://<your-url>/api/health` → expect
   `{"status":"ok","db":{"ok":true}...}`. If Render's health check fails,
   the service restarts — check logs.
3. **Sign in:** `https://<your-url>/login` with `admin@subscrr.app` +
   your `ADMIN_PASSWORD`.
4. **CMS admin:** `https://<your-url>/admin` with `admin@subscrr.local` +
   your `PAYLOAD_ADMIN_PASSWORD`. The 6 blog posts are seeded automatically
   during the build (idempotent — safe on every deploy).
5. **Set `FRONTEND_URL`** in the Environment tab and **Manually Deploy →
   Deploy latest commit** once, so reset emails and CMS URLs use your real
   domain.

## What auto-provisions on a fresh deploy

- **App DB schema + migrations** — run at server boot (`server.mjs`)
- **Admin account** — created from `ADMIN_PASSWORD` at boot (idempotent)
- **Content DB (blog)** — schema pushed at first Payload access (`push: true`),
  posts + images seeded during build from `frontend/public/assets/blog`
- **Directories** — uploads/ and media-uploads/ created automatically

## The one caveat you must know: cold starts

Render's free/starter tier **spins the service down after ~15 min idle**. The
next visitor waits ~30–60s while it boots (SQLite migration check, seed check,
Next hydration). Options:

- **Paid instance (Starter+)** — always-on, recommended for a real product
- **UptimeRobot / cron ping** every 10 min on `/api/health` — keeps free
  instances warm (works, but it's a workaround, and free-tier hours are
  limited to 750/month)

## Data safety

- **Everything durable lives on the disk mount** (`/opt/data`): both SQLite
  databases, uploads, media. Redeploys keep data; **disk resize or deletion
  does not** — Render disks are the source of truth.
- **Backups:** Render disks don't snapshot automatically. Download the DB
  periodically (Render Dashboard → Disks, or SFTP) or add a cron job that
  copies `subscrr.db` to object storage. SQLite makes this trivial.
- **Scale:** keep maxInstances = 1 (default in render.yaml). Two instances
  would split SQLite writes and double-run the alert scheduler. For
  multi-instance scale later: Postgres for the app DB + S3 for uploads.

## Local production rehearsal (do this before deploying)

```bash
npm run build                 # backend dist + frontend .next
DATA_DIR=./data-render \
DB_PATH=./data-render/subscrr.db \
UPLOAD_DIR=./data-render/uploads \
PAYLOAD_DATABASE_URI=file:./data-render/subscrr-content.db \
PAYLOAD_MEDIA_DIR=./data-render/media-uploads \
NODE_ENV=production \
JWT_SECRET=local-rehearsal-secret-0123456789abcdef \
PAYLOAD_SECRET=local-rehearsal-payload-0123456789ab \
ADMIN_PASSWORD=local-admin-pass-123 \
PAYLOAD_ADMIN_PASSWORD=local-cms-pass-123 \
PORT=4000 \
npm run start:all
```

> **Windows note:** `npm run build:render` locally also needs
> `PAYLOAD_DATABASE_URI`/`PAYLOAD_MEDIA_DIR` pointing at a **rehearsal** DB
> (not your dev `frontend/subscrr-content.db`) — a production-mode build
> against a dev-pushed DB triggers Payload's interactive migration prompt and
> hangs. On Render this is already handled by render.yaml (fresh DB on the
> persistent disk).

Then verify: `http://localhost:4000/api/health`, the landing page,
`/login`, `/blog`, `/admin`, and a dashboard sign-in.
