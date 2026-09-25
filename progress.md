# Progress Log — AMESL (Asset Matrix Energy)

## Infra / Setup
- **Cloudflare R2** — storage created, bucket public via `r2.dev`. All `.env.local` keys populated and verified end-to-end (S3 PUT/GET, public URL HTTP 200, delete 204). Test script cleaned up. Added **bucket CORS policy** (`GET/HEAD/PUT/POST`, `AllowedOrigins *`, `AllowedHeaders *`) so browser-side presigned uploads from the admin work; fixed "Failed to fetch" on image upload. Hardened `lib/client-upload.ts` PUT with try/catch (clear "could not reach storage server" toast instead of unhandled "Failed to fetch").
- **Product image display** — found the uploaded object in R2 (`products/*.jpeg`) had never been linked: earlier upload/validation failures meant no `product_images` row was saved. Linked it to "DDCE 50plus" (is_primary, display_order 0). Verified: `/products/dinnteco/ddce-50plus` shows the image, `/products?brand=dinnteco` listing shows the card thumbnail.
- **Aiven PostgreSQL** — `sql/schema.sql` + `sql/seed.sql` applied via `pg` (no psql installed). 13 tables created; seed: 29 brands, 7 categories, 10 site settings, 3 hero slides. Fixed 3 duplicate hero slides (seed's `on conflict (id)` is not idempotent — re-running duplicates slides).
- **Database connection** — `lib/db.ts` and `scripts/create-admin.mjs` strip `sslmode` to let explicit SSL config govern TLS (Aiven self-signed certs).
- **GitHub** — logged in via `gh` as `asset-etcon` (admin/push on `asset-etcon/amesl`). Pushed `main` (commit `b6c893d`).
- **Vercel** — initial build failed: `DATABASE_URL not configured` because env vars aren't on Vercel. ⬜ **TODO (user):** add `DATABASE_URL`, `R2_*`, `SESSION_SECRET`, `PG_POOL_MAX` in the Vercel project dashboard that auto-deploys from GitHub, then Redeploy. Note: `vercel link` here created a duplicate `amesl` project under `vethan-concepts-technologies` (harmless, can delete).

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
- Lint: 0 errors (pre-existing `react-hooks/incompatible-library` warnings from react-hook-form `watch()` only). `npx tsc --noEmit` passes.
- Do not commit unless asked.