/**
 * Shared query-string and facet logic for the /products catalogue.
 *
 * The listing has several independent facets (search, brand, label, sort,
 * page) and every link on the page — pagination, the label chips, the empty
 * state — has to rebuild all of them except the one it is changing. Getting that
 * wrong is invisible until a visitor hits it, so the rules live here and
 * scripts/verify-product-query.mts pins them.
 *
 * fetchLabelFacets lives here for the same reason: an inlined query inside a
 * page component cannot be reached by any check, and this one is easy to get
 * subtly wrong.
 */
import { and, asc, count, desc, eq, type SQL } from "drizzle-orm";
import { brands, productLabelAssignments, productLabels, products } from "@/db/schema";
import type { Database } from "@/lib/db";

export interface CatalogueQuery {
  q: string;
  brand: string;
  /** Slug of the active label, or "" when no label filter is applied. */
  label: string;
  sort: string;
}

/** The default sort, omitted from URLs because /products already means it. */
export const DEFAULT_SORT = "newest";

/**
 * Builds a /products href from the current facet state.
 *
 * Two rules, and the second is the one that is easy to get wrong:
 *
 * 1. The current values are seeded first, so a caller changing one facet
 *    inherits the rest for free. This is what lets the pagination links pass
 *    only `page` and keep the brand, label and search intact.
 *
 * 2. An empty or missing value in `extra` DELETES that key rather than being
 *    ignored. `params.set(k, "")` would emit `?label=`, and simply skipping
 *    would leave the seeded value in place — so "All labels" would link back to
 *    the very page it is on. A caller therefore clears a facet by passing "".
 */
export function buildCatalogueHref(current: CatalogueQuery, extra: Record<string, string> = {}): string {
  const params = new URLSearchParams();
  if (current.q) params.set("q", current.q);
  if (current.brand) params.set("brand", current.brand);
  if (current.label) params.set("label", current.label);
  if (current.sort && current.sort !== DEFAULT_SORT) params.set("sort", current.sort);

  for (const [key, value] of Object.entries(extra)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }

  const query = params.toString();
  return query ? `/products?${query}` : "/products";
}

export interface LabelFacet {
  slug: string;
  name: string;
  total: number;
}

/**
 * The label chips for the catalogue grid, each with the number of published
 * products behind it.
 *
 * Scoped to `brandSlug` when one is given, so a brand page only ever offers its
 * own labels. Left unscoped otherwise, which is what makes the cross-brand
 * "all labels" list on /products?label=x still able to jump sideways into
 * another brand's labels.
 *
 * `q` and `sort` are deliberately NOT part of the scope: a chip row that
 * reshuffles as you type is disorienting, and a label whose products happen not
 * to match the search is still a real label of this brand. That case lands on
 * the empty state, which names the label and offers the way back.
 *
 * The brand param is the raw slug, not the resolved brand row, so this stays in
 * lockstep with the product filter in the page: an unknown or inactive slug
 * filters the grid to nothing and therefore yields no chips either.
 */
export async function fetchLabelFacets(db: Database, brandSlug: string): Promise<LabelFacet[]> {
  const conditions: SQL[] = [eq(productLabels.status, "active"), eq(products.status, "published")];
  if (brandSlug) conditions.push(eq(brands.slug, brandSlug));

  const rows = await db
    .select({ slug: productLabels.slug, name: productLabels.name, displayOrder: productLabels.display_order, total: count() })
    .from(productLabels)
    .innerJoin(productLabelAssignments, eq(productLabelAssignments.label_id, productLabels.id))
    .innerJoin(products, eq(products.id, productLabelAssignments.product_id))
    .innerJoin(brands, eq(products.brand_id, brands.id))
    .where(and(...conditions))
    .groupBy(productLabels.id, productLabels.slug, productLabels.name, productLabels.display_order)
    .orderBy(desc(count()), asc(productLabels.display_order), asc(productLabels.name));

  return rows.map((row) => ({ slug: row.slug, name: row.name, total: Number(row.total) }));
}
