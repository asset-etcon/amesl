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