# Daybill Standalone — Build Contract

All builders MUST follow this contract exactly. It is the single source of truth for API shapes, types, and conventions.

## Project layout (root: ~/workspace/daybill-standalone/)

```
daybill-standalone/
  package.json            # root scripts (dev, build)
  .gitignore
  vercel.json             # /api/* -> serverless functions, SPA fallback
  capacitor.config.ts
  README.md               # written by packaging agent
  shared/
    types.ts              # shared TypeScript types (copy of the interfaces below)
  api/                    # backend handlers — Vercel serverless compatible
    _lib/
      db.ts               # db adapter: better-sqlite3 locally, pg when DATABASE_URL set
      auth.ts             # JWT sign/verify, requireAuth, requireAdmin middleware fns
      schema.ts           # CREATE TABLE IF NOT EXISTS migrations, run on boot
      seed.ts             # admin seed
    auth/
      register.ts         # POST
      login.ts            # POST (user: phone + pin)
      admin-login.ts      # POST (admin: email + password)
      me.ts               # GET
    customers.ts          # GET (list w/ search), POST (create)
    customers/[id].ts     # GET (detail + history), PUT, DELETE
    suppliers.ts          # GET, POST
    suppliers/[id].ts     # GET (detail + history), PUT, DELETE
    products.ts           # GET, POST
    products/[id].ts      # PUT, DELETE
    invoices.ts           # GET (list w/ filters), POST (create + decrement stock)
    invoices/[id].ts      # GET (detail w/ items)
    purchases.ts          # GET (list), POST (create; type + delivered flag)
    purchases/[id].ts     # GET, POST /deliver (mark delivered → stock++, payables++)
    dashboard.ts          # GET ?range=7d|1m|3m|6m|9m|1y|lifetime
    feedback.ts           # GET (admin: all, newest first), POST (user submits)
    admin/
      accounts.ts         # GET (admin only: all users newest first, NO pin/password hashes)
  server.ts               # local-dev Express server: mounts every api/* handler at /api/*
  frontend/               # Vite + React + TS + Tailwind app
    package.json, vite.config.ts, tailwind.config.js, tsconfig.json
    index.html
    public/
      manifest.webmanifest, sw.js (or vite-plugin-pwa), icons/, assets/ (ALREADY STAGED — do not move)
    src/
      main.tsx, App.tsx, index.css
      api/client.ts       # fetch wrapper: base = import.meta.env.VITE_API_URL || '' ; /api prefix
      auth/AuthContext.tsx
      i18n/               # en.ts, ur.ts, LanguageContext (RTL toggle, persisted)
      theme/ThemeContext.tsx  # light/dark, persisted
      components/         # Avatar, BottomSheet, PopupSheet, StatCard, AreaChart, etc.
      pages/              # Splash, Welcome, Login, Dashboard, Invoices, InvoiceDetail,
                          # CreateInvoice, Contacts, ContactDetail, Products, Purchases,
                          # Profile, Feedback, Admin, NotFound
      utils/              # avatar.ts, phone.ts, invoiceImage.ts, whatsapp.ts
```

Handlers are plain `(req, res) => Promise<void> | void` functions, default-exported.
`server.ts` maps them into Express. Vercel serves `api/**/*.ts` as functions automatically.

## Conventions

- Phone display format EVERYWHERE: `0300-0000000` (4 digits, dash, 7 digits). Validate with `/^03\d{2}-\d{7}$/`.
- Phone storage: digits only (`03001234567`). `phone.ts`: `toDisplay(digits)`, `toDigits(display)`, `toWhatsApp(digits)` → `92` + digits.slice(1) (e.g. `923001234567`).
- wa.me link: `https://wa.me/<toWhatsApp(phone)>` — opened via `window.open(url, '_blank')`. NO text prefill on invoice shares (image-only rule).
- Deterministic avatar: `avatarFor(id: string): string` → hash id chars → index 0..11 → `/assets/avatars/avatar-0X.png`. Same id ⇒ same avatar EVERYWHERE (contacts, admin accounts, feedback senders — derive from the ACCOUNT/CONTACT id, never from row index or name).
- Assets (already in `frontend/public/assets/`, reference as `/assets/...`):
  - `logo-dark.png` (light surfaces), `logo-white.png` (dark-teal surfaces)
  - `welcome-shopkeeper.png` (welcome slide 1), `welcome-billing.png` (slide 2), `welcome-sharing.png` (slide 3)
  - `desktop-shopkeeper-3d.png` (desktop login left panel), `monster-404.png` (404 page)
  - `avatars/avatar-01.png` … `avatar-12.png`
- Colors: deep dark teal `#0B3B39`-ish for headers/banners/splash/sidebar; emerald `#10B981`-ish accents; content surfaces white/light with dark text. Dark theme: dark surfaces, light text, teal headers stay deep teal.
- Invoices (generated PNG/PDF/print): ONLY the shop's own branding (shop name/address/logo, accent color). NEVER Daybill/Muse branding.
- Auth: `Authorization: Bearer <jwt>`. JWT secret from `JWT_SECRET` env (dev default ok, warn in README). Token payload: `{ sub: userId, role }`.
- Admin: sole admin email `hadiaghazanfar354@gmail.com`. Seed on boot: if `ADMIN_PASSWORD` env set use it, else generate random, bcrypt-hash it, print once to console. NEVER return pin_hash/password_hash in any API response.

## Env vars

```
DATABASE_URL=            # postgres when set (Supabase/Neon); else local ./data/daybill.db (sqlite)
JWT_SECRET=              # required in production
ADMIN_EMAIL=hadiaghazanfar354@gmail.com
ADMIN_PASSWORD=          # optional; else random generated + printed on first boot
VITE_API_URL=            # frontend: '' (same origin) locally via proxy; set for deploys if split
PORT=3001                # local backend
```

## Database schema (SQLite + Postgres compatible)

```sql
users(id TEXT PK, name TEXT, phone TEXT UNIQUE, shop_name TEXT, shop_address TEXT,
      pin_hash TEXT, email TEXT UNIQUE, password_hash TEXT, role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now')));
customers(id TEXT PK, user_id TEXT, name TEXT, phone TEXT, address TEXT, created_at TEXT);
suppliers(id TEXT PK, user_id TEXT, name TEXT, phone TEXT, address TEXT, created_at TEXT);
products(id TEXT PK, user_id TEXT, name TEXT, cost_price REAL, selling_price REAL,
         stock INTEGER DEFAULT 0, created_at TEXT);
invoices(id TEXT PK, user_id TEXT, customer_id TEXT, invoice_no TEXT, date TEXT,
         discount REAL DEFAULT 0, payment_method TEXT, due_status TEXT DEFAULT 'pending',
         accent_color TEXT, notes TEXT, created_at TEXT);
invoice_items(id TEXT PK, invoice_id TEXT, product_id TEXT, qty INTEGER, price REAL);
purchases(id TEXT PK, user_id TEXT, supplier_id TEXT, type TEXT, -- 'purchase_order' | 'delivered_purchase'
          delivered INTEGER DEFAULT 0, date TEXT, notes TEXT, created_at TEXT);
purchase_items(id TEXT PK, purchase_id TEXT, product_id TEXT, qty INTEGER, cost REAL);
feedback(id TEXT PK, user_id TEXT, category TEXT, message TEXT, created_at TEXT);
```
- IDs: `crypto.randomUUID()`. created_at: ISO strings (use `new Date().toISOString()` in code; keep SQL portable).
- db.ts exposes `query(sql, params=[]) → Promise<rows[]>`, `get`, `run` (returning lastID/changes). Write SQL with `?` placeholders; db.ts translates to `$1` for pg.

## API endpoints

Auth:
- `POST /api/auth/register` `{name, phone(display), shopName, shopAddress, pin(4 digits)}` → `201 {token, user}`. Validate phone format, pin `/^\d{4}$/`, unique phone. bcrypt pin.
- `POST /api/auth/login` `{phone, pin}` → `{token, user}`. 401 on bad creds.
- `POST /api/auth/admin-login` `{email, password}` → `{token, user}` (role admin).
- `GET /api/auth/me` → `{user}` (auth required).
- `user` shape: `{id, name, phone(display), shopName, shopAddress, email?, role, createdAt}` — NEVER hashes.

Customers / Suppliers (auth; scoped to user_id):
- `GET /api/customers?q=` → `{customers: [{id,name,phone(display),address,totalBilled,invoiceCount,lastTransaction}]}` (compute via invoices)
- `POST /api/customers` `{name, phone, address?}` → 201
- `GET /api/customers/:id` → `{customer, stats:{totalBilled,invoiceCount,paidTotal,pendingTotal,lastTransaction}, history:[invoices desc]}`
- PUT/DELETE similar. Same for `/api/suppliers` (stats from delivered purchases only).

Products (auth; scoped):
- `GET /api/products` → `{products}`; `POST` `{name, costPrice, sellingPrice, stock}`; `PUT /api/products/:id`; `DELETE`.

Invoices (auth; scoped):
- `GET /api/invoices?status=&q=` → `{invoices, summary:{total,paid,pending}}`
- `POST /api/invoices` `{customerId, date, items:[{productId, qty, price}], discount, paymentMethod, dueStatus, accentColor, notes}` → validate stock for each item (409 if insufficient), decrement stock, `201 {invoice}`.
- `GET /api/invoices/:id` → `{invoice, items:[{...productName}], customer}`.

Purchases (auth; scoped):
- `GET /api/purchases` → `{purchases}` each with `{id, supplierName, type, delivered, date, total, itemCount}`.
- `POST /api/purchases` `{supplierId, date, type:'purchase_order'|'delivered_purchase', items:[{productId, qty, cost}], notes}` → if delivered_purchase: stock++ immediately; purchase_order: delivered=0, no stock change.
- `POST /api/purchases/:id/deliver` → sets delivered=1, stock++ for its items (idempotent: 409 if already delivered).

Dashboard (auth; scoped):
- `GET /api/dashboard?range=7d|1m|3m|6m|9m|1y|lifetime` → `{revenue, cost, profit, customerDues, supplierPayables, received, series:[{date, revenue}], recentActivity:[...]}`.
  - revenue = sum(invoice totals in range); cost = sum(qty*cost_price at sale time — approximate via product cost_price); customerDues = pending invoice totals; supplierPayables = delivered-purchase totals unpaid (all delivered purchases count as payable).

Feedback:
- `POST /api/feedback` (auth) `{category:'Bug'|'Suggestion'|'Other', message}` → 201 `{ok:true}`.
- `GET /api/feedback` (admin) → `{feedback:[{id, senderName, shopName, phone(display), category, message, createdAt}]}` newest first. Avatar derived from `user_id` via avatarFor.

Admin:
- `GET /api/admin/accounts` (admin) → `{accounts:[{id, name, phone(display), shopName, shopAddress, createdAt}]}` newest first, role='user' only. Avatar from account `id`.

## Frontend pages/routes

- `/` splash (deep teal, white logo, ~1.5s) → `/welcome` (logged-out) or `/dashboard` (logged-in)
- `/welcome` — 3 slides (illustrations above), dots, heading+tagline, "Access Your Account" → `/login`, "Don't have an account? Signup" → `/register`. Even vertical rhythm (logo → illustration → heading → tagline → dots → button → signup). Mobile only layout; desktop shows split view directly at `/login`.
- `/login` — User/Admin toggle. User: phone (auto-format 0300-0000000) + 4-digit PIN. Admin: email + password. Desktop: left illustrated panel (desktop-shopkeeper-3d.png) + right login card.
- `/register` — name, phone, shop name, shop address, PIN → auto-login.
- App shell (auth required): mobile = floating rounded bottom nav, 6 tabs: Overview, Bills, Create, Contacts, Products, Profile (original order). Desktop = dark-teal sidebar (expanded grouped) + collapsible icon rail.
- `/dashboard` (Overview): received card, stat cards (Revenue, Cost, Profit, Customer Dues, Supplier Payables), range selector (7 days, 1 month, 3/6/9 months, 1 year, Lifetime), area-line chart, recent activity.
- `/bills` — invoice list + status summary + search + filter; purchase docs section (Purchase Orders vs Delivered Purchases with labels).
- `/bills/:id` — invoice Details: preview + buttons: "Share on WhatsApp" (green pill), "Share image to another app", "Create another invoice". (NO "Save image" button.)
- `/create` — create invoice with LIVE preview; product picker with stock validation; discount; payment method; due status; accent color; shop logo.
- `/contacts` — customers/suppliers tabs; `/contacts/:id` history (total billed, invoice count, paid/pending, last transaction, chronological history).
- `/products` — catalogue with stock.
- `/purchases/new` — Purchase Order vs Delivered Purchase toggle.
- `/profile` — shop info, Feedback (category + message + confirmation), logout; theme + language toggles.
- `/admin` (role=admin only, server-guarded) — Registered Accounts + User Feedback sections.
- `*` — teal 404 page with monster-404.png.

## WhatsApp share flow (frontend, implement EXACTLY)

On InvoiceDetail, "Share on WhatsApp" tap:
1. Show bottom-sheet popup "Preparing…" immediately.
2. Render invoice into PNG (offscreen `InvoiceImage` component, `html-to-image` toPng on the node; shop branding only).
3. Wrap EVERYTHING in a timeout race (~8s total). Any awaited sub-step (fonts, images, canvas) gets its own timeout.
4. On success: trigger REAL download (`a[download]` click with object URL) → show "Downloaded" bottom-sheet (green check) for ~3.6s → `window.open('https://wa.me/<intl>', '_blank')`.
5. On failure/timeout: error bottom-sheet ("Couldn't prepare the image. Try again."), restore buttons. NEVER hang on "Preparing…". NEVER show success unless the download actually started.
6. "Share image to another app": `navigator.share({files})` if `navigator.canShare`, else fall back to download.
7. Invoice shares are IMAGE ONLY — no wa.me `?text=`.

## i18n + theme

- `en` + `ur` dictionaries; `ur` sets `dir="rtl"`. Persist `daybill-lang`, `daybill-theme` in localStorage. Toggle in Profile.
- Tagline: "Roz ka karobar, ab asaan" / "Your daily trade, simplified".
