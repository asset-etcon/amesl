import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ProductCard, type CardProduct } from "@/components/public/product-card";
import { BrandWall } from "@/components/public/brand-wall";
import { CatalogueSearch } from "@/components/public/catalogue-search";
import { LabelFilter } from "@/components/public/label-filter";
import { db } from "@/lib/db";
import { buildCatalogueHref, fetchLabelFacets } from "@/lib/product-catalogue";
import { products, brands as brandsTable, categories, productImages, productLabels, productLabelAssignments } from "@/db/schema";
import { eq, and, inArray, asc, desc, count, ilike } from "drizzle-orm";
import { cn } from "@/lib/utils";

const PER_PAGE = 12;

interface SearchParams {
  q?: string;
  brand?: string;
  category?: string;
  sort?: string;
  page?: string;
  label?: string;
}

const CATALOGUE_DESCRIPTION =
  "Browse specialist industrial reliability, condition monitoring, testing, diagnostics and instrumentation equipment represented by Asset Matrix Energy.";

/**
 * One route serves several distinct views, so the canonical has to be computed
 * per request:
 *   /products            the brand wall — self-canonical
 *   /products?brand=x    a real brand landing page — self-canonical
 *   /products?q=…&page=2 duplicates of the above — folded back to the base
 * Internal search results are `noindex` so they never compete with /products.
 */
export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const sp = await searchParams;
  const brand = (sp.brand ?? "").trim();
  const isSearch = Boolean((sp.q ?? "").trim());
  const label = (sp.label ?? "").trim();

  if (isSearch) {
    return {
      title: "Search",
      robots: { index: false, follow: true },
      alternates: { canonical: brand ? `/products?brand=${brand}` : "/products" },
    };
  }

  // Label views are internal facets. Many labels can each produce a near-empty
  // grid, so indexing them all would be a thin-page problem; they canonical to
  // the base or brand page instead of to themselves.
  if (label) {
    return {
      title: "Products",
      robots: { index: false, follow: true },
      alternates: { canonical: brand ? `/products?brand=${brand}` : "/products" },
    };
  }

  if (!brand) {
    return { title: "Product Catalogue", description: CATALOGUE_DESCRIPTION, alternates: { canonical: "/products" } };
  }

  const brandRow = await db
    .select({ name: brandsTable.name, description: brandsTable.description })
    .from(brandsTable)
    .where(and(eq(brandsTable.slug, brand), eq(brandsTable.status, "active")))
    .limit(1);

  // An unknown or inactive brand slug must not be indexable as a thin page.
  if (!brandRow[0]) {
    return { title: "Product Catalogue", robots: { index: false, follow: true }, alternates: { canonical: "/products" } };
  }

  return {
    title: `${brandRow[0].name} Products`,
    description: brandRow[0].description || `Browse ${brandRow[0].name} equipment supplied and supported by Asset Matrix Energy.`,
    alternates: { canonical: `/products?brand=${brand}` },
    openGraph: { title: `${brandRow[0].name} Products`, description: CATALOGUE_DESCRIPTION, url: `/products?brand=${brand}` },
  };
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const brand = sp.brand ?? "";
  const sort = sp.sort ?? "newest";
  const labelSlug = (sp.label ?? "").trim();

  // Resolved once and guarded by status, so an unknown or inactive slug matches
  // nothing rather than silently falling back to the whole catalogue.
  const labelRows = labelSlug
    ? await db
        .select({ slug: productLabels.slug, name: productLabels.name })
        .from(productLabels)
        .where(and(eq(productLabels.slug, labelSlug), eq(productLabels.status, "active")))
        .limit(1)
    : [];
  const activeLabel = labelRows[0] ?? null;

  const brandRows = await db
    .select({ slug: brandsTable.slug, name: brandsTable.name, logo_url: brandsTable.logo_url })
    .from(brandsTable)
    .where(eq(brandsTable.status, "active"))
    // Admins control this order with the "Display order" field on /admin/brands.
    // Name is kept as a tiebreaker so two brands sharing a number cannot swap
    // places between renders, which would make the wall look broken.
    .orderBy(asc(brandsTable.display_order), asc(brandsTable.name));

  // label must count as a filter too, or /products?label=x would fall through to
  // the brand wall instead of showing the matching grid.
  const isFiltered = Boolean(q || brand || activeLabel || (sp.sort && sp.sort !== "newest"));

  if (!isFiltered) {
    return (
      <>
        <Navbar />
        <main>
          <div className="catalogue">
            <CatalogueSearch q={q} />
            <BrandWall brands={brandRows} />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const page = Math.max(1, Number(sp.page) || 1);
  const from = (page - 1) * PER_PAGE;

  const conditions = [eq(products.status, "published")];
  if (brand) conditions.push(eq(brandsTable.slug, brand));
  if (q) conditions.push(ilike(products.name, `%${q}%`));
  if (activeLabel) {
    // A subquery on products.id rather than a join: joining the label table
    // would multiply rows for a product carrying several labels and break the
    // count() below.
    conditions.push(
      inArray(
        products.id,
        db
          .select({ product_id: productLabelAssignments.product_id })
          .from(productLabelAssignments)
          .innerJoin(productLabels, eq(productLabelAssignments.label_id, productLabels.id))
          .where(eq(productLabels.slug, activeLabel.slug)),
      ),
    );
  }
  const where = and(...conditions);

  const listQuery = db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      short_description: products.short_description,
      created_at: products.created_at,
      brand_name: brandsTable.name,
      brand_slug: brandsTable.slug,
      category_name: categories.name,
    })
    .from(products)
    .innerJoin(brandsTable, eq(products.brand_id, brandsTable.id))
    .leftJoin(categories, eq(products.category_id, categories.id))
    .where(where)
    .orderBy(sort === "name" ? asc(products.name) : desc(products.created_at))
    .limit(PER_PAGE)
    .offset(from);

  const countQuery = db
    .select({ value: count() })
    .from(products)
    .innerJoin(brandsTable, eq(products.brand_id, brandsTable.id))
    .where(where);

  const [productRows, countRows] = await Promise.all([listQuery, countQuery]);

  const ids = productRows.map((p) => p.id);
  const imageMap = new Map<string, string>();
  if (ids.length) {
    const imageRows = await db
      .select({ product_id: productImages.product_id, url: productImages.url })
      .from(productImages)
      .where(inArray(productImages.product_id, ids))
      .orderBy(desc(productImages.is_primary), asc(productImages.display_order));
    for (const img of imageRows) if (!imageMap.has(img.product_id)) imageMap.set(img.product_id, img.url);
  }

  const rows: CardProduct[] = productRows.map((p) => ({
    name: p.name,
    slug: p.slug,
    brandSlug: p.brand_slug ?? "",
    brandName: p.brand_name ?? "",
    categoryName: p.category_name ?? null,
    shortDescription: p.short_description,
    imageUrl: imageMap.get(p.id) ?? null,
  }));

  const total = countRows[0]?.value ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  const activeBrand = brandRows.find((b) => b.slug === brand);

  const buildQuery = (extra: Record<string, string>) =>
    buildCatalogueHref({ q, brand, label: activeLabel?.slug ?? "", sort }, extra);

  // Label chips with a published-product count, scoped to the active brand so a
  // brand page never offers a label it has no products for.
  const facetRows = await fetchLabelFacets(db, brand);

  // A label can be active while falling outside the facets — a cross-brand link
  // followed onto another brand's page, say. Keep it in the row so exactly one
  // chip is ever highlighted; the 0 is honest and matches the empty grid below.
  const facets = facetRows.slice();
  if (activeLabel && !facets.some((f) => f.slug === activeLabel.slug)) {
    facets.unshift({ slug: activeLabel.slug, name: activeLabel.name, total: 0 });
  }

  return (
    <>
      <Navbar />
      <main>
        <div className="catalogue">
          <div className="catalogue-list-head">
            <div className="eyebrow">
              {activeBrand ? "Brand products" : q ? "Search results" : activeLabel ? "Label" : "Products"}
            </div>
            <h1>
              {activeBrand
                ? `${activeBrand.name} products`
                : q
                  ? `Results for “${q}”`
                  : activeLabel
                    ? `${activeLabel.name} products`
                    : "Products"}
            </h1>
            {activeBrand && (
              <Link href="/products" className="cat-back">
                All brands
              </Link>
            )}
          </div>

          <CatalogueSearch q={q} brand={activeBrand ? brand : undefined} label={activeLabel?.slug} />

          <LabelFilter
            labels={facets}
            activeSlug={activeLabel?.slug}
            hrefFor={(slug) => buildQuery({ label: slug, page: "" })}
          />

          {rows.length ? (
            <>
              <div className="product-grid">
                {rows.map((product) => (
                  <ProductCard key={product.slug} product={product} />
                ))}
              </div>

              {pageCount > 1 && (
                <nav className="pagination" aria-label="Product pages">
                  {Array.from({ length: pageCount }, (_, i) => i + 1)
                    .filter((n) => n === 1 || n === pageCount || Math.abs(n - page) <= 1)
                    .reduce<Array<number | "…">>((acc, n) => {
                      if (acc.length && typeof acc[acc.length - 1] === "number" && (acc[acc.length - 1] as number) + 1 < n) acc.push("…");
                      acc.push(n);
                      return acc;
                    }, [])
                    .map((n, i) =>
                      n === "…" ? (
                        <span key={`e${i}`} className="page-gap">…</span>
                      ) : (
                        <Link key={n} href={buildQuery({ page: String(n) })} aria-current={n === page ? "page" : undefined} className={cn("page-link", n === page && "is-active")}>
                          {n}
                        </Link>
                      )
                    )}
                </nav>
              )}
            </>
          ) : (
            <div className="empty-cat">
              <h3>No products found</h3>
              <p>
                {activeLabel
                  ? `No products are tagged “${activeLabel.name}” under the current filters.`
                  : "Try adjusting your search or browse all brands."}
              </p>
              {activeLabel ? (
                <Link className="button button-dark" href={buildQuery({ label: "", page: "" })}>
                  All labels
                </Link>
              ) : (
                <Link className="button button-dark" href="/products">All brands</Link>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}