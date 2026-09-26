# Progress Log — AMESL (Asset Matrix Energy)

## Infra / Setup
- **Cloudflare R2** — storage created, bucket public via `r2.dev`. All `.env.local` keys populated and verified end-to-end (S3 PUT/GET, public URL HTTP 200, delete 204). Test script cleaned up. Added **bucket CORS policy** (`GET/HEAD/PUT/POST`, `AllowedOrigins *`, `AllowedHeaders *`) so browser-side presigned uploads from the admin work; fixed "Failed to fetch" on image upload. Hardened `lib/client-upload.ts` PUT with try/catch (clear "could not reach storage server" toast instead of unhandled "Failed to fetch").
- **Product image display** — found the uploaded object in R2 (`products/*.jpeg`) had never been linked: earlier upload/validation failures meant no `product_images` row was saved. Linked it to "DDCE 50plus" (is_primary, display_order 0). Verified: `/products/dinnteco/ddce-50plus` shows the image, `/products?brand=dinnteco` listing shows the card thumbnail.
- **Aiven PostgreSQL** — `sql/schema.sql` + `sql/seed.sql` applied via `pg` (no psql installed). 13 tables created; seed: 29 brands, 7 categories, 10 site settings, 3 hero slides. Fixed 3 duplicate hero slides (seed's `on conflict (id)` is not idempotent — re-running duplicates slides).
- **Database connection** — `lib/db.ts` and `scripts/create-admin.mjs` strip `sslmode` to let explicit SSL config govern TLS (Aiven self-signed certs).
- **Postgres connection exhaustion — root cause found and fixed.** The `remaining connection slots are reserved for roles with the SUPERUSER attribute` errors were **not** a transient blip. Measured on the live Aiven service:
  ```
  max_connections                 20
  - superuser_reserved            -3   (avnadmin is NOT a superuser, so these are unreachable)
  - Aiven internal backends      -12   (TimescaleDB, pg_failover_slots, pg_cron, unnamed slots)
  - Aiven management-agent        -1   (held open by Aiven)
  ------------------------------------
  available for this application    4
  ```
  `PG_POOL_MAX` was **5**, so a *single* process could exhaust the server unaided. A 40-request burst produced **17 × 5xx**. Fixes in `lib/db.ts`: default lowered to 2 in production / 3 in dev and **capped at 10**; `idleTimeoutMillis` 30s → 10s (hand slots back fast); `maxUses: 500` (recycle through proxies); `statement_timeout: 10s` (a stuck query can't pin one of 4 slots); `connectionTimeoutMillis` 15s (queue for a slot rather than fail instantly); `application_name: "amesl"` so our connections are identifiable in `pg_stat_activity`. `.env.local` and `.env.example` now set `PG_POOL_MAX=2`.
  - Same burst after the fix: **40/40 ok, 0 server errors**, `amesl` connections capped at 2 and reclaimed to 0 after the idle timeout. 4 connections per 20 is the ceiling for this plan — use `PG_POOL_MAX=1` if you ever run more than ~2 concurrent Vercel instances, or raise the Aiven plan.
  - Note: `globalThis.__ameslPool` is pinned for the life of the process, so `lib/db.ts` pool changes only take effect after a **full server restart**, not Fast Refresh.
- **GitHub** — logged in via `gh` as `asset-etcon` (admin/push on `asset-etcon/amesl`). Pushed `main` (commit `b6c893d`).
- **Vercel** — initial build failed: `DATABASE_URL not configured` because env vars aren't on Vercel. ⬜ **TODO (user):** add `DATABASE_URL`, `R2_*`, `SESSION_SECRET`, `PG_POOL_MAX` in the Vercel project dashboard that auto-deploys from GitHub, then Redeploy. Note: `vercel link` here created a duplicate `amesl` project under `vethan-concepts-technologies` (harmless, can delete).
  - The `vercel` CLI on this machine is authenticated to the **`vethan-concepts-technologies`** scope only; `vercel team ls` shows no `asset-etcon` team and `vercel project ls --scope asset-etcon` returns `scope-does-not-exist`. The production project's env vars therefore cannot be set from here — dashboard only.

## Quote requests — email, rate limiting, admin search
- **Email (Resend, no new npm dependency).** New `lib/mail/resend.ts` (plain `fetch` to `api.resend.com/emails`, 8s `AbortSignal` timeout, `Idempotency-Key` per quote, `siteUrl()` with `VERCEL_PROJECT_PRODUCTION_URL` → `VERCEL_URL` auto-detect, comma-separated `QUOTE_NOTIFY_EMAILS` parsing), `lib/mail/templates.ts` (table-based inline-styled HTML + plain text for the internal alert and the customer acknowledgement; brand gold `#e7a42b` / navy; all values HTML-escaped), `lib/mail/notify.ts` (`Promise.allSettled` so a slow customer mail can't delay the internal alert; logs `[mail] quote <id> …` on failure).
  - `app/actions/quote.ts` now inserts with `.returning()`, then sends mail **after** the row is committed, inside its own try/catch. **A mail outage never fails a customer submission** — the admin dashboard stays the system of record. Verified end-to-end: with mail unconfigured the action still returned `{"ok":true}` and logged `Email is not configured. Set RESEND_API_KEY, MAIL_FROM_EMAIL`.
  - ⬜ **TODO (user):** verify a sending domain in Resend, create an API key, then set `RESEND_API_KEY` / `MAIL_FROM_EMAIL` / `MAIL_FROM_NAME` / `MAIL_REPLY_TO_EMAIL` / `QUOTE_NOTIFY_EMAILS` / `SITE_URL` in `.env.local` **and in the Vercel project**.
  - **Live end-to-end test (2026-09-26) — submission path is healthy, mail is not.** Submitted a real quote over the server action (action id read from `.next/dev/server/app/products/[brand]/[slug]/page/server-reference-manifest.json`, body encoded with `react-server-dom-webpack/client.edge`'s `encodeReply`) → `{"ok":true}`, row written, `notifyNewQuote` called. **Resend rejected the send:**
    ```
    POST https://api.resend.com/emails  ->  403
    {"statusCode":403,
     "message":"The assetmatrixenenrgy.com domain is not verified. Please, add and verify your domain on https://resend.com/domains",
     "name":"validation_error"}
    ```
    The `RESEND_API_KEY` in `.env.local` belongs to the **vethancon** Resend account (its `/emails` list returns only `notifications@vethancon.com` / `onboarding@vethancon.com` traffic). `vethancon.com` is verified there; `assetmatrixenenrgy.com` is not a domain on that account at all. The send fails silently by design — the quote row is still stored and the action still returns `ok:true`, so nothing surfaces in the UI and `quote_requests` is unaffected (test row deleted; table back to 0).
    - ⬜ **TODO (user):** add + verify `assetmatrixenenrgy.com` in Resend (Domains → Add Domain → add the SPF/DKIM records at the DNS provider for that domain), **or** issue a key from the AMESL Resend account instead. Until then outbound quote mail is silently dropped.
    - ⚠️ **Possible typo:** the configured domain reads `assetmatrix**enenrgy**.com` (transposed `ne`/`en`). Worth confirming against the real domain before spending DNS records on it.
    - ⬜ **TODO (user):** `SITE_URL` is still `http://localhost:3000`; set it to the production origin (or leave blank on Vercel, where it auto-detects) or every link in the internal alert email will point at localhost.
- **Public form hardening.** The submit action was unauthenticated and unthrottled; adding outbound email made spam cheaper. Applied in order: honeypot `website` field (off-screen, `aria-hidden`, `tabIndex={-1}`; returns `ok:true` so bots learn nothing), fill-time check (`QUOTE_MIN_FILL_MS` 2.5s floor, 6h staleness ceiling), in-process burst limit (3/min, `lib/rate-limit.ts` sliding window with sweep), and a **shared** limit that holds across serverless instances (5/hour, 12/day) counted from a new `quote_requests.submitter_hash` column — a salted SHA-256 of `x-forwarded-for`, so **no raw IPs are stored**. The DB check returns `null` and falls back to the in-process limit if that column is missing, so the form never breaks on an un-migrated database.
  - **DDL applied to the live database** (idempotent, also in `sql/schema.sql`): `alter table quote_requests add column if not exists submitter_hash text` + `quote_requests_submitter_hash_idx`. `EXPLAIN` confirms the rate-limit query uses that index, not a seq scan.
  - Verified: legit submit accepted; honeypot / 400ms submit / stale 8h form all rejected **without writing a row**; burst 4 → 4th rejected; pre-seeded client already at the 5/hour cap → rejected, nothing written. Test rows deleted afterwards; `quote_requests` back to 0.
- **Admin quote list.** Search across name/email/company/product, sort (newest / oldest / quantity / customer A-Z), archived toggle (active / archived / all) — `components/admin/quote-filters.tsx`, modelled on `product-filters.tsx`. Status pills and pagination now preserve the active filters, and the active pill is highlighted. **Bug fixed:** the old list rendered only a `Prev` link with no `Next`, so page 3+ was unreachable — pagination moved into `QuoteTable` using the shared `Pagination` component.

## Admin UI
- **Brand color audit** — brand primary = gold `#e7a42b`; text on gold = dark navy `#172633` (`--ink`); hover = `#f3bb4e`. Matches public `.button-accent`.
- **Admin buttons** converted to brand gold (`bg-[#e7a42b] text-[#172633] hover:bg-[#f3bb4e]`):
  - `components/admin/ui.tsx` — `Button` variants (primary/accent/outline/ghost), Modal close, Pagination Prev/Next. `danger` stays red (`#dc2626` white text).
  - "New product/brand/category/hero-slide" links on admin pages + dashboard.
  - Table icon buttons across `brand-table`, `category-table`, `hero-slide-table`, `product-table`, `quote-table`, `media-grid`, `featured-products` (delete buttons stay red `#b3261e`).
  - All quote-page buttons (status pills, Prev, archive/open, mailto/tel, `quote-detail-controls` via Button variants).
  - Form Cancel links (`brand-form`, `category-form`, `hero-slide-form`, `product-form`), upload tiles, `topbar` Sign out, `rich-text-editor` toolbar (base gold, active navy), login submit (gold + navy text), media page Prev/Next.
- **Product form (`/admin/products/new`)** — reduced font sizes on all text buttons: 13.5px→12px (Cancel/Save & publish/Create product), 12px→11px (sm buttons), 11px→10px (Set primary).

## Public Site
- **`/products` brand/OEM logo directory** (new `components/public/brand-wall.tsx`, `components/public/catalogue-search.tsx`):
  - Default `/products` shows ONLY a search bar + the full brand-logo grid (from the `brands` table, active brands, `logo_url`). No product listing.
  - Each logo links to `/products?brand=<slug>` — that brand's product listing (h1 = brand name, same search bar pre-scoped to the brand, "All brands" back link).
  - Search submits to `/products?q=...` → product results page (h1 "Results for…").
  - Removed the sidebar controls entirely (deleted `catalogue-controls.tsx`): no category/sort dropdowns, no `.cat-controls` sidebar.
  - CSS: `.brand-wall*` grid (grayscale→color hover, gold ring for active brand), `.cat-search-top`, `.catalogue-list-head`, `.cat-back`; responsive 2-col on mobile.
  - All 29 `/pics/brands/*` files match DB seed paths and are git-tracked. Lint/tsc clean; all three views verified (directory 29 logos / brand listing / search results).

## Notes
- Lint: 0 errors (pre-existing `react-hooks/incompatible-library` warnings from react-hook-form `watch()` only). `npx tsc --noEmit` passes. `npm run build` passes.
- No test framework in the repo; changes were verified with real HTTP calls to the server action and direct queries against the live database.
- `globalThis.__ameslPool` survives Fast Refresh, so pool config changes need a full `npm run dev` restart.
- Do not commit unless asked.
