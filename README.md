# Daybill

Invoicing app for small shop owners / wholesalers. Pre-saved suppliers and repeat customers, product catalog with stock tracking, invoice generation with live preview, shop logo and color branding, print/PDF, WhatsApp image share, sales/revenue dashboard, due/payment reminders, supplier purchase orders, user feedback, and an admin panel (registered accounts + feedback inbox).

Invoices carry **only the shop owner's own branding** — no Daybill/Muse marks. Invoice shares over WhatsApp are always **image photos**, never text.

## Tech stack

- **Frontend:** Vite + React 18 + TypeScript + Tailwind CSS 3, React Router 6, `html-to-image` (invoice PNG rendering), PWA (service worker + web manifest, offline-capable shell)
- **Backend:** Express (local dev) + Vercel serverless functions (production). Same handler files (`api/**/*.ts`) run in both.
- **Database:** SQLite via `better-sqlite3` locally (`data/daybill.db`); Postgres via `pg` when `DATABASE_URL` is set (Supabase). SQL is written with `?` placeholders; the adapter translates to `$1` for Postgres.
- **Auth:** JWT (Bearer) + bcrypt. Users log in with phone + 4-digit PIN; admin logs in with email + password.
- **APK path:** Capacitor config included (`capacitor.config.ts`); the native project is created by the owner later (see below).

## Project layout

```
daybill-standalone/
  package.json            # root scripts: dev:api, dev:web, build
  vercel.json             # frontend build, /api/* serverless functions, SPA fallback
  capacitor.config.ts     # appId com.daybill.app, webDir frontend/dist
  server.ts               # local-dev Express server (mounts every api/* handler)
  api/                    # backend handlers (Vercel serverless compatible)
    _lib/                 # db adapter, JWT auth, schema migrations, admin seed
    auth/                 # register, login, admin-login, me
    customers.ts, customers/[id].ts
    suppliers.ts, suppliers/[id].ts
    products.ts, products/[id].ts
    invoices.ts, invoices/[id].ts
    purchases.ts, purchases/[id].ts, purchases/[id]/deliver.ts
    dashboard.ts, feedback.ts, admin/accounts.ts
  frontend/               # Vite + React + TS + Tailwind app
    public/               # manifest.webmanifest, sw.js, icons/, assets/
    src/                  # pages, components, api client, auth, i18n, utils
```

## Local development

Prerequisites: **Node.js 20+** and npm.

```bash
# Terminal 1 — backend (http://localhost:3001)
cd api && npm install
cd .. && npm run dev:api        # runs server.ts via tsx

# Terminal 2 — frontend (http://localhost:5173)
cd frontend && npm install
npm run dev                     # /api requests are proxied to localhost:3001
```

Open **http://localhost:5173**. On first backend boot, an admin password is generated and printed to the console **once** — copy it, or set `ADMIN_PASSWORD` to skip generation (see below).

Production build check:

```bash
npm run build        # from the repo root: builds frontend into frontend/dist
```

## Environment variables

| Variable         | Required | Default / behavior                                                                 |
|------------------|----------|------------------------------------------------------------------------------------|
| `DATABASE_URL`   | prod     | Postgres connection string (e.g. Supabase). When unset, local SQLite `./data/daybill.db` is used. |
| `JWT_SECRET`     | prod     | Secret for signing auth tokens. Dev default is a fixed string — **set a real secret in production.** |
| `ADMIN_EMAIL`    | no       | `hadiaghazanfar354@gmail.com` |
| `ADMIN_PASSWORD` | no       | If set, the admin account is seeded with it. If unset, a random password is generated on first boot and printed **once** to the console. Set it on Vercel to avoid losing access. |
| `VITE_API_URL`   | no       | Frontend API base. `''` (same origin) for local dev via Vite proxy and for Vercel (frontend + API served together). Set it only if the API is hosted on a different origin. |
| `PORT`           | no       | Local backend port. Default `3001`. |

Local `.env` files go next to `server.ts` (repo root) — e.g. `DATABASE_URL=...`, `JWT_SECRET=...`, `ADMIN_PASSWORD=...`. They are git-ignored.

## Supabase Postgres setup

1. Create a project at supabase.com → **Project Settings → Database → Connection string** (use the **URI** / pooled or direct connection string).
2. The schema is created automatically on boot (`CREATE TABLE IF NOT EXISTS` in `api/_lib/schema.ts`) — no manual migration needed.
3. Locally: set `DATABASE_URL=<connection string>` in a `.env` file at the repo root, restart the API, and confirm tables are created.
4. On Vercel: **Project → Settings → Environment Variables** → add `DATABASE_URL` (same string), plus `JWT_SECRET` and `ADMIN_PASSWORD`.

## Deploying on Vercel

1. Push this folder to GitHub (drag-and-drop the unzipped folder or `git push`).
2. Vercel → **Add New → Project → Import** the repo. Framework preset is irrelevant (`framework: null` in `vercel.json` — the build command runs the Vite build explicitly).
3. Set env vars: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_PASSWORD` (see table above).
4. Deploy. Vercel runs `cd frontend && npm install && npm run build`, serves `frontend/dist` as the static site, deploys each `api/**/*.ts` file as a serverless function (Node 20), and rewrites every non-`/api/*` route to `/index.html` so client-side routing works.

## APK via Capacitor

The Capacitor config is ready (`appId: com.daybill.app`, `webDir: frontend/dist`). The native Android project is **not** in the repo — the owner generates it:

```bash
npm run build                 # production web build → frontend/dist
npm install @capacitor/core
npm install -D @capacitor/cli
npx cap init                  # accepts capacitor.config.ts as-is
npx cap add android           # creates android/
npx cap sync                  # copies frontend/dist into the native app
```

Then open `android/` in **Android Studio** → Build → Generate Signed Bundle/APK.

On every later release: rebuild the web app (`npm run build`), run `npx cap sync` again, and re-export the APK from Android Studio.

## WhatsApp share flow (and its platform limit)

On an invoice's detail page, **"Share on WhatsApp"** does this:

1. Shows a "Preparing…" bottom sheet immediately.
2. Renders the invoice (shop branding only) into a PNG offscreen, wrapped in timeout races (~8s total) so it can never hang.
3. On success: triggers a **real download** of the PNG → shows a "Downloaded" confirmation (~3.6s) → opens `https://wa.me/<customer number>` in a new tab.
4. On failure: shows an error sheet and restores the buttons — never hangs, never claims success unless the download actually started.

**Platform limit:** WhatsApp's `wa.me` links cannot attach a photo — no web app can auto-send an image into a chat on any platform. So after the image auto-downloads, the **user attaches it manually** in the chat that opens. "Share image to another app" uses `navigator.share({files})` where supported, else falls back to download. Invoice shares are image-only — no prefilled text.

## Admin access

- Sign in on the login screen via the **Admin** toggle with `ADMIN_EMAIL` + the seeded `ADMIN_PASSWORD`.
- `/admin` shows **Registered Accounts** (name, phone, shop name, shop address, creation date — newest first; no PIN/password hashes are ever returned) and **User Feedback** (sender, shop, phone, category, date).
- Server-side guards: regular users get `403` on admin endpoints; the admin UI route also requires the `admin` role.
- If you lose the generated password, set `ADMIN_PASSWORD` in your env and delete the admin row (or the local `data/daybill.db`) so the seed runs again with the known password.
