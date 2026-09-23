import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ProductCard, type CardProduct } from "@/components/public/product-card";
import { CatalogueControls, type ControlOption } from "@/components/public/catalogue-controls";
import { db } from "@/lib/db";
import { products, brands as brandsTable, categories as categoriesTable, productImages } from "@/db/schema";
import { eq, and, inArray, asc, desc, count, ilike } from "drizzle-orm";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Product Catalogue | Asset Matrix Energy",
  description: "Browse specialist industrial reliability, condition monitoring, testing, diagnostics and instrumentation equipment represented by Asset Matrix Energy.",
};

const PER_PAGE = 12;

interface SearchParams {
  q?: string;
  brand?: string;
  category?: string;
  sort?: string;
  page?: string;
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const brand = sp.brand ?? "";
  const category = sp.category ?? "";
  const sort = sp.sort ?? "newest";
  const page = Math.max(1, Number(sp.page) || 1);
  const from = (page - 1) * PER_PAGE;

  const conditions = [eq(products.status, "published")];
  if (brand) conditions.push(eq(brandsTable.slug, brand));
  if (category) conditions.push(eq(categoriesTable.slug, category));
  if (q) conditions.push(ilike(products.name, `%${q}%`));
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
      category_name: categoriesTable.name,
      category_slug: categoriesTable.slug,
    })
    .from(products)
    .innerJoin(brandsTable, eq(products.brand_id, brandsTable.id))
    .leftJoin(categoriesTable, eq(products.category_id, categoriesTable.id))
    .where(where)
    .orderBy(sort === "name" ? asc(products.name) : desc(products.created_at))
    .limit(PER_PAGE)
    .offset(from);

  const countQuery = db
    .select({ value: count() })
    .from(products)
    .innerJoin(brandsTable, eq(products.brand_id, brandsTable.id))
    .leftJoin(categoriesTable, eq(products.category_id, categoriesTable.id))
    .where(where);

  const [productRows, countRows, brandRows, categoryRows] = await Promise.all([
    listQuery,
    countQuery,
    db.select({ slug: brandsTable.slug, name: brandsTable.name }).from(brandsTable).where(eq(brandsTable.status, "active")).orderBy(asc(brandsTable.name)),
    db.select({ slug: categoriesTable.slug, name: categoriesTable.name }).from(categoriesTable).where(eq(categoriesTable.status, "active")).orderBy(asc(categoriesTable.name)),
  ]);

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
    categoryName: p.category_name,
    shortDescription: p.short_description,
    imageUrl: imageMap.get(p.id) ?? null,
  }));

  const total = countRows[0]?.value ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const hasFilters = Boolean(q || brand || category);
  const brands: ControlOption[] = brandRows.map((b) => ({ value: b.slug, label: b.name }));
  const categories: ControlOption[] = categoryRows.map((c) => ({ value: c.slug, label: c.name }));

  const buildQuery = (extra: Record<string, string>) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (brand) params.set("brand", brand);
    if (category) params.set("category", category);
    if (sort && sort !== "newest") params.set("sort", sort);
    Object.entries(extra).forEach(([k, v]) => (v ? params.set(k, v) : null));
    const s = params.toString();
    return s ? `/products?${s}` : "/products";
  };

  return (
    <>
      <Navbar />
      <main>
        <div className="catalogue">
          <div className="catalogue-head">
            <div className="eyebrow">Product catalogue</div>
            <h1>Specialist equipment,<br />organised by technology partner.</h1>
            <p>
              {total.toLocaleString()} product{total === 1 ? "" : "s"} represented by Asset Matrix Energy — request a quote and our engineering team will respond within one business day.
            </p>
          </div>

          <div className="catalogue-layout">
            <CatalogueControls brands={brands} categories={categories} current={{ q, brand, category, sort }} hasFilters={hasFilters} />

            <div>
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
                  <p>Try adjusting your search or removing filters.</p>
                  <Link className="button button-dark" href={buildQuery({})}>View all products</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
