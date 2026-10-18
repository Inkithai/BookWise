# Deploying BookWise — Vercel + Render + Supabase

Production topology:

```
Browser
   │
   ├──► Vercel ──── fe/  Next.js 16 frontend        https://<app>.vercel.app
   │                 │
   │                 └── (axios, Bearer tokens) ──┐
   │                                              ▼
   └────────────────────────────────► Render ── be/  Laravel 12 API (Docker)
                                                 │     https://bookwise-api.onrender.com
                                                 ▼
                                        Supabase ── PostgreSQL (session pooler :5432)
```

- **Vercel** hosts the Next.js frontend from `fe/`.
- **Render** hosts the Laravel API from `be/` using `be/Dockerfile`
  (nginx + php-fpm), described by the [`render.yaml`](./render.yaml) blueprint.
- **Supabase** provides the PostgreSQL database. The codebase is
  driver-aware: it runs on MySQL locally and PostgreSQL in production.

Everything below is a one-time setup, after which pushing to `main`
redeploys both services automatically. The API container applies pending
migrations on boot (`RUN_MIGRATIONS=true`, handled by
`be/docker/entrypoint.sh`) — Render's pre-deploy step is a paid-plan feature,
so it is deliberately not used by this Blueprint.

---

## 1. Supabase — database

1. [Create a project](https://supabase.com/dashboard) — pick a region close
   to your Render region (e.g. **Southeast Asia (Singapore)**).
2. Set a strong **database password** and keep it handy.
3. In **Project Settings → Database → Connection info**, note the
   **Session pooler** values (use session mode, port `5432` — it behaves
   like a normal Postgres server and is safe for `artisan migrate`):

   | Render env var    | Supabase value                                        |
   | ----------------- | ----------------------------------------------------- |
   | `DB_CONNECTION`   | `pgsql`                                                |
   | `DB_HOST`         | `aws-0-<region>.pooler.supabase.com`                   |
   | `DB_PORT`         | `5432` (session) — `6543` is transaction pooling       |
   | `DB_DATABASE`     | `postgres`                                             |
   | `DB_USERNAME`     | `postgres.<project-ref>`                               |
   | `DB_PASSWORD`     | your database password                                 |
   | `DB_SSLMODE`      | `require`                                              |

   > Supabase free projects pause after ~1 week of inactivity — disable
   > pausing or accept a slow first request.

Tables are created by `php artisan migrate --force`, which the API container
runs automatically when it starts (`RUN_MIGRATIONS=true` in `render.yaml`,
executed by `be/docker/entrypoint.sh`). Migrations only run on the web
service so the worker can never race them.

---

## 2. Generate one-time secrets (local machine, PHP ≥ 8.2)

Run these inside `be/` with a local `.env` (any DB works — even sqlite —
these commands don't touch the database):

```bash
cd be
cp .env.example .env

# APP_KEY → copy the base64:... value into Render's APP_KEY
php artisan key:generate --show

# Passport OAuth signing keys
php artisan passport:keys
cat storage/oauth-private.key   # → PASSPORT_PRIVATE_KEY
cat storage/oauth-public.key    # → PASSPORT_PUBLIC_KEY
```

When pasting the keys into Render environment variables, **keep them on a
single line** and replace real newlines with `\n` (Passport converts `\n`
back automatically). Example:

```
PASSPORT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMC8CAQ...\n...\n-----END PRIVATE KEY-----\n"
```

> No local PHP? Deploy once with dummy values, then use the Render
> **Shell** tab (`php artisan key:generate --show`, `php artisan
> passport:keys`, `cat storage/oauth-*.key`) and paste the results into
> the env vars — the container filesystem is ephemeral, so env vars are
> the source of truth, not the generated files.

---

## 3. Render — Laravel API

### Option A (recommended): Blueprint

1. Render dashboard → **New → Blueprint** → connect the repo containing
   this project. Render finds [`render.yaml`](./render.yaml) and creates:
   - `bookwise-api` — web service (Docker image built from `be/`, health
     check `/up`, migrations applied at container start)
   - `bookwise-worker` — queue worker + Laravel scheduler under supervisord
     *(paid instance; delete it if you set `QUEUE_CONNECTION=sync` and don't
     need cron)*
2. Fill in every **sync: false** variable (APP_KEY, APP_URL,
   FRONTEND_URL, CORS_ALLOWED_ORIGINS, DB_*, PASSPORT_* keys, mail/Stripe/
   Google if used). `APP_URL` = the Render URL, e.g.
   `https://bookwise-api.onrender.com`.
3. Apply → Render builds the Docker image; the container migrates the
   database and boots.

> The Blueprint intentionally avoids `preDeployCommand`: Render only offers
> it on paid instances and rejects a free-plan Blueprint that sets it.
> Migrations run from the entrypoint instead (`RUN_MIGRATIONS=true`).

### Option B: Manual web service

| Setting           | Value                                                     |
| ----------------- | --------------------------------------------------------- |
| Root Directory    | `be`                                                      |
| Runtime           | Docker (`Dockerfile`)                                     |
| Health check path | `/up`                                                     |
| Docker command    | *(leave empty — the image CMD starts nginx/php-fpm)*      |
| Env var           | `RUN_MIGRATIONS=true` — applies migrations at boot        |
| Pre-deploy cmd    | *(paid plans only)* `php artisan migrate --force`         |

…then add the same environment variables as in `render.yaml`.

### First-boot tasks (Render → bookwise-api → Shell tab)

```bash
# Roles, permissions, plans, invoice types and the super-admin user
php artisan db:seed --force

# Seed each tenant's chart of accounts / fiscal year / settings
php artisan accounting:seed-defaults <host_id>

# Optional: back-post pre-existing invoices into the ledger
php artisan invoice:sync-ledger
```

The seeder creates super-admin `super-host@gmail.com` / `super@123` —
**change this password immediately** in production.

Verify: `curl https://bookwise-api.onrender.com/up` → `200`.

> **Free plan note:** free web services spin down after inactivity; the
> first request can take ~50 s. Upgrade to Starter for always-on.

---

## 4. Vercel — Next.js frontend

1. [Import](https://vercel.com/new) the repository.
2. **Root Directory: `fe`** (this is the only non-default setting Vercel
   needs — framework, build and output are auto-detected).
3. Add environment variables (see [`fe/.env.example`](./fe/.env.example)).
   The critical one:

   ```
   NEXT_PUBLIC_API_BASE_URL=https://bookwise-api.onrender.com
   ```

   > Root URL **without** `/api` and **without** a trailing slash — the
   > services append `/api/v1` themselves.

4. Deploy.
5. Copy the resulting URL (e.g. `https://bookwise-fe.vercel.app`) back
   into Render:
   - `FRONTEND_URL=https://bookwise-fe.vercel.app`
   - `CORS_ALLOWED_ORIGINS=https://bookwise-fe.vercel.app` (comma-separated
     list once you add a custom domain)

   …then redeploy/restart the API service.

> `NEXT_PUBLIC_*` values are baked in **at build time** — after changing
> them in Vercel, trigger a redeploy.

---

## 5. Optional integrations

- **Mail (OTP, notifications):** set `MAIL_MAILER=smtp` plus
  `MAIL_HOST/PORT/USERNAME/PASSWORD` on Render (Mailtrap, Brevo, SES,
  Postmark all work). Until then `MAIL_MAILER=log` writes mails to the
  app log.
- **Google OAuth:** set `GOOGLE_CLIENT_ID/SECRET` on Render and
  `GOOGLE_REDIRECT_URI=https://<vercel-app>/auth/google/callback`; add the
  same redirect URI in Google Cloud Console.
- **Stripe:** set `STRIPE_*` on Render and `NEXT_PUBLIC_STRIPE_KEY`
  (publishable key only) on Vercel. Webhook endpoints:
  `https://<api-host>/api/v1/admin/plans/stripe/webhook` (subscriptions) and
  `https://<api-host>/api/v1/admin/invoices/stripe/webhook` (invoices).
- **File uploads:** Render's disk is ephemeral — user uploads do not
  survive redeploys. For persistent files switch `FILESYSTEM_DISK=s3` and
  add the `AWS_*` variables (S3, DigitalOcean Spaces or Cloudflare R2).

---

## 6. Custom domains (later)

1. Add the domain to the Vercel project and to the Render service.
2. Update `APP_URL`, `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS` (Render) and
   rebuild the frontend so `NEXT_PUBLIC_API_BASE_URL` points at the API
   domain.

---

## 7. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Blueprint import fails: `must NOT have additional properties` with `root` | Render has no `root:` key. Use `dockerContext: ./be` + `dockerfilePath: ./be/Dockerfile` (as in `render.yaml`). |
| Image build fails: `The "--optimize-autoloader" option does not exist` | `composer dump-autoload` only accepts `--optimize` (`-o`) — the long `--optimize-autoloader` alias belongs to `composer install`. See `be/Dockerfile`. |
| Blueprint import fails: pre-deploy commands require a paid plan | Remove `preDeployCommand`; migrations run at boot via `RUN_MIGRATIONS=true` (`be/docker/entrypoint.sh`). |
| Worker never processes jobs, logs show nginx/php-fpm | Docker services ignore `startCommand`. Set `dockerCommand: supervisord -n -c /etc/supervisord-worker.conf`. |
| Deploy succeeds but tables are missing | The web container must get `RUN_MIGRATIONS=true`; check the entrypoint logs for `Applying database migrations`. |
| Browser console shows CORS errors | `CORS_ALLOWED_ORIGINS` must list the exact frontend origin(s); restart the API after changing it. |
| `No application encryption key has been specified` | Set `APP_KEY` (`base64:...`) on Render and redeploy. |
| Passport errors about keys / `oauth` 500s | `PASSPORT_PRIVATE_KEY` / `PASSPORT_PUBLIC_KEY` must contain the full PEM with `\n` line escapes. |
| Migrations fail with SSL errors | Use the **session** pooler host with `DB_SSLMODE=require`. |
| `could not connect to server` from Render | Supabase project paused, or wrong `DB_USERNAME` format (`postgres.<project-ref>`). |
| Frontend gets 404/401 on every call | `NEXT_PUBLIC_API_BASE_URL` must be the API **root** (no `/api` suffix) and the frontend must be rebuilt after changing it. |
| Queued jobs never run | Start `bookwise-worker` (or set `QUEUE_CONNECTION=sync`). |
| Analytics endpoints 500 on Postgres | Pull the latest code — raw SQL is now driver-aware via `App\Support\DbDialect`. |

---

## Environment reference

**Backend (Render)** — full list with defaults in
[`be/.env.example`](./be/.env.example); production values come from
[`render.yaml`](./render.yaml).

**Frontend (Vercel)** — full list with explanations in
[`fe/.env.example`](./fe/.env.example).
