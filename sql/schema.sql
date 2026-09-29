-- =====================================================================
-- Asset Matrix Energy — Admin & Product Catalogue database schema
-- Target: Aiven for PostgreSQL (or any plain PostgreSQL 14+).
-- Run in your Aiven instance (psql / SQL client) BEFORE sql/seed.sql.
-- Authorization is enforced in the application (role checks), so there is
-- no database-level RLS and no dependency on Supabase Auth.
-- No pricing tables or price columns exist anywhere in the schema.
-- =====================================================================

-- ---------- helpers ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null default '',
  full_name text not null default '',
  role text not null default 'sales'
    check (role in ('super_admin', 'product_manager', 'content_manager', 'sales')),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------- brands ----------
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  logo_url text not null default '',
  website text not null default '',
  status text not null default 'active' check (status in ('active', 'inactive')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists brands_set_updated_at on public.brands;
create trigger brands_set_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();

-- ---------- categories ----------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'inactive')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------- products ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  brand_id uuid not null references public.brands(id) on delete restrict,
  category_id uuid references public.categories(id) on delete set null,
  short_description text not null default '',
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  featured boolean not null default false,
  seo_title text not null default '',
  seo_description text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_brand_id_idx on public.products (brand_id);
create index if not exists products_category_id_idx on public.products (category_id);
create index if not exists products_status_idx on public.products (status);
create index if not exists products_featured_idx on public.products (featured);
create index if not exists products_created_at_idx on public.products (created_at desc);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------- product_images ----------
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt text not null default '',
  is_primary boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_id_idx on public.product_images (product_id);

-- ---------- product_specifications ----------
create table if not exists public.product_specifications (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  value text not null,
  display_order integer not null default 0
);

create index if not exists product_specifications_product_id_idx on public.product_specifications (product_id);

-- ---------- product_documents ----------
create table if not exists public.product_documents (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,
  url text not null,
  file_type text not null default 'pdf',
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_documents_product_id_idx on public.product_documents (product_id);

-- ---------- product_labels ----------
create table if not exists public.product_labels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'inactive')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_labels_status_idx on public.product_labels (status, display_order);

drop trigger if exists product_labels_set_updated_at on public.product_labels;
create trigger product_labels_set_updated_at
  before update on public.product_labels
  for each row execute function public.set_updated_at();

-- ---------- product_label_assignments ----------
-- Composite primary key makes a duplicate label on one product impossible, and
-- both cascades keep orphan rows from surviving a deleted product or label.
create table if not exists public.product_label_assignments (
  product_id uuid not null references public.products(id) on delete cascade,
  label_id uuid not null references public.product_labels(id) on delete cascade,
  display_order integer not null default 0,
  primary key (product_id, label_id)
);

create index if not exists product_label_assignments_label_id_idx on public.product_label_assignments (label_id);

-- ---------- quote_requests ----------
create table if not exists public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  product_name text not null default '',
  brand_name text not null default '',
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null default '',
  company_name text not null default '',
  message text not null default '',
  quantity integer not null default 1 check (quantity >= 1),
  status text not null default 'new'
    check (status in ('new', 'contacted', 'quotation_sent', 'negotiating', 'completed', 'cancelled')),
  internal_notes text not null default '',
  archived boolean not null default false,
  -- Salted hash of the submitting client, used for cross-instance rate limiting.
  submitter_hash text,
  created_at timestamptz not null default now()
);

create index if not exists quote_requests_status_idx on public.quote_requests (status);
create index if not exists quote_requests_created_at_idx on public.quote_requests (created_at desc);

-- Added after the table shipped: salted client hash for cross-instance rate limiting.
-- Idempotent, so re-running this file is safe on both old and new databases.
alter table public.quote_requests add column if not exists submitter_hash text;
create index if not exists quote_requests_submitter_hash_idx on public.quote_requests (submitter_hash);

-- ---------- hero_slides ----------
create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  image_desktop text not null,
  image_mobile text not null default '',
  headline text not null,
  subtext text not null default '',
  cta_label text not null default '',
  cta_href text not null default '',
  status text not null default 'active' check (status in ('active', 'inactive')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Added after the table shipped: the set_updated_at trigger below assigns
-- new.updated_at, which cannot work on a table that has no such column.
alter table public.hero_slides add column if not exists updated_at timestamptz not null default now();

drop trigger if exists hero_slides_set_updated_at on public.hero_slides;
create trigger hero_slides_set_updated_at
  before update on public.hero_slides
  for each row execute function public.set_updated_at();

-- ---------- homepage_featured_products ----------
create table if not exists public.homepage_featured_products (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null unique references public.products(id) on delete cascade,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- media ----------
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  file_type text not null default '',
  size_bytes bigint not null default 0,
  width integer,
  height integer,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- site_settings ----------
create table if not exists public.site_settings (
  key text primary key,
  value text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- ---------- news_categories ----------
create table if not exists public.news_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'inactive')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists news_categories_status_idx on public.news_categories (status);

drop trigger if exists news_categories_set_updated_at on public.news_categories;
create trigger news_categories_set_updated_at
  before update on public.news_categories
  for each row execute function public.set_updated_at();

-- ---------- news_posts ----------
-- `body` holds rich text HTML authored in the admin. It is sanitised against an
-- allowlist in the server action before it is written (see lib/sanitize.ts) and
-- is only ever rendered through the sanitiser's output, never raw.
create table if not exists public.news_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text not null default '',
  body text not null default '',
  cover_image text not null default '',
  cover_image_alt text not null default '',
  category_id uuid references public.news_categories(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  featured boolean not null default false,
  -- Null means "publish as soon as the status flips to published". A future
  -- value holds the post back until that instant; every public read filters on
  -- it via the shared predicate in lib/news.ts.
  publish_at timestamptz,
  seo_title text not null default '',
  seo_description text not null default '',
  -- Per-article opt-in for the public comment thread. Default false, so an
  -- article that shipped before comments existed stays closed until an editor
  -- ticks it. The public submit action re-checks this server-side; hiding the
  -- form in the admin is not what keeps a closed article closed.
  allow_comments boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists news_posts_status_idx on public.news_posts (status);
create index if not exists news_posts_category_id_idx on public.news_posts (category_id);
create index if not exists news_posts_featured_idx on public.news_posts (featured);
-- Partial index matching the exact predicate every public listing uses:
-- status = 'published' ordered by publish_at then created_at.
create index if not exists news_posts_published_idx
  on public.news_posts (publish_at desc, created_at desc)
  where status = 'published';
-- Sitemap ordering walks every visible post by recency.
create index if not exists news_posts_created_at_idx on public.news_posts (created_at desc);

drop trigger if exists news_posts_set_updated_at on public.news_posts;
create trigger news_posts_set_updated_at
  before update on public.news_posts
  for each row execute function public.set_updated_at();

-- ---------- post_comments ----------
-- `create table if not exists` above is a no-op against a database that already
-- has news_posts, so the column this feature depends on is added here as well.
-- Both are idempotent: a fresh database gets the column from the create
-- statement, an existing one from this, and running it twice changes nothing.
-- Keeping the alter in this section rather than in news_posts means running the
-- comments migration applies the whole feature, not half of it.
alter table public.news_posts
  add column if not exists allow_comments boolean not null default false;

-- Public comments on a news article. There is no visitor identity in this
-- application, so `author_name` is self-declared and `author_email` is stored for
-- moderation only: neither is ever rendered on a public page, and the email is
-- not published anywhere in the admin either beyond the moderation queue.
--
-- `submitter_hash` is the salted, truncated IP hash from lib/rate-limit.ts, used
-- to enforce the cross-instance comment rate limit. Raw IP addresses are never
-- stored. Unlike quote_requests, the count is a simple per-window roll: the limit
-- applies to a visitor across every article, not per post, so one rolling count
-- per submitter_hash is the whole check.
--
-- `status` defaults to 'published': a comment appears immediately, by decision.
-- It exists so an editor can hide a borderline comment and restore it, with hard
-- delete still available for spam. The public read path filters on
-- status = 'published' via the shared predicate in lib/comments.ts.
create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.news_posts(id) on delete cascade,
  author_name text not null,
  author_email text not null,
  body text not null,
  status text not null default 'published' check (status in ('published', 'hidden')),
  submitter_hash text not null default '',
  created_at timestamptz not null default now()
);

-- Serves the entire public read path: one post, published only, oldest first.
create index if not exists post_comments_post_id_idx
  on public.post_comments (post_id, created_at)
  where status = 'published';
-- Backs the cross-instance rate limit count.
create index if not exists post_comments_submitter_hash_idx
  on public.post_comments (submitter_hash, created_at);
-- Admin queue ordering: newest first across all posts.
create index if not exists post_comments_created_at_idx
  on public.post_comments (created_at desc);

-- ---------- services ----------
-- The public /services grid and its /services/<slug> detail pages.
-- `overview` holds the entire body of a service page as rich-text HTML authored
-- in the admin, sanitised against an allowlist in the write path (see
-- lib/sanitize.ts) and only ever rendered through the sanitiser's output.
-- h1-h6, p, ul/ol/li, strong, em, br and blockquote are on the allowlist, so
-- subheadings and bulleted lists inside the overview are supported.
--
-- `icon` stores a key into the curated map in lib/service-icons.ts, not the name
-- of an SVG component: it is admin-editable input, so it is validated against
-- SERVICE_ICON_KEYS in the server action and falls back to a default on read.
--
-- status is active/inactive rather than news' draft/published/archived. A
-- service page is either offered or not, and there is nothing to schedule, so
-- there is deliberately no publish_at column.
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  summary text not null default '',
  icon text not null default 'activity',
  overview text not null default '',
  image text not null default '',
  image_alt text not null default '',
  status text not null default 'active' check (status in ('active', 'inactive')),
  display_order integer not null default 0,
  seo_title text not null default '',
  seo_description text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The structured sections that stood beside the overview -- "What this service
-- covers", "How we deliver it" and "What you receive" -- were folded into
-- `overview` as headings and lists rather than deleted, so the technical copy
-- survives. These drops retire the now-unused columns. `if exists` keeps the
-- section idempotent and converging: a no-op on a database already created from
-- the table above, a cleanup on one created from the earlier shape. The removed
-- copy is recoverable from git history at commit 9bd7fa3.
alter table public.services drop column if exists scope;
alter table public.services drop column if exists method;
alter table public.services drop column if exists deliverables;

-- The copy those three columns held is preserved here rather than discarded, and
-- is also recoverable from git history at commit 9bd7fa3. Nothing in the
-- application reads or writes this table; it exists so the removal above is
-- auditable and reversible without a restore. Safe to drop once the folded-in
-- overviews are signed off.
create table if not exists public.services_retired_copy (
  slug text primary key,
  scope text not null default '',
  method text not null default '',
  deliverables text not null default '',
  archived_at timestamptz not null default now()
);

-- Serves both public reads: the ordered /services grid and the homepage band,
-- which are the same query apart from a limit.
create index if not exists services_status_idx on public.services (status, display_order);

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

-- ---------- audit_logs ----------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  user_email text not null default '',
  action text not null,
  resource text not null,
  resource_id text not null default '',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);