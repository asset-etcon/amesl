/**
 * Verifies the product label feature against the live database: that both
 * tables exist with the expected keys, that the join returns labels for a
 * product, that the listing's `inArray` subquery matches exactly the products
 * carrying a label, that an inactive label is excluded from public reads, and
 * that deleting a product cascades its assignments away.
 *
 * Inserts throwaway rows under a `t-` slug prefix and removes them at the end.
 *
 *   npx tsx scripts/verify-product-labels.mts
 */
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const { db } = await import("../lib/db");
const { brands, productLabels, productLabelAssignments, products } = await import("../db/schema");
const { and, asc, eq, inArray, sql } = await import("drizzle-orm");
const { slugify } = await import("../lib/utils");
const { fetchLabelFacets } = await import("../lib/product-catalogue");

let failures = 0;
const check = (label: string, pass: boolean, detail = "") => {
  if (!pass) failures++;
  console.log(`${pass ? "pass" : "FAIL"}  ${label}${detail ? `  -> ${detail}` : ""}`);
};

const stamp = Date.now();
const tSlug = (name: string) => `${slugify(name)}-${stamp}`;

// 1. Both tables must be present, or every later query throws a relation error.
const { rows: labelTableRows } = await db.execute<{ reg: string | null }>(
  sql`select to_regclass('public.product_labels') as reg`,
);
const { rows: assignmentTableRows } = await db.execute<{ reg: string | null }>(
  sql`select to_regclass('public.product_label_assignments') as reg`,
);
check("product_labels table exists", Boolean(labelTableRows[0]?.reg));
check("product_label_assignments table exists", Boolean(assignmentTableRows[0]?.reg));

// 2. The composite primary key must reject a duplicate assignment outright.
const activeLabel = await db
  .select({ id: productLabels.id, name: productLabels.name, slug: productLabels.slug })
  .from(productLabels)
  .where(eq(productLabels.status, "active"))
  .orderBy(asc(productLabels.display_order))
  .limit(1);
check("at least one seeded active label exists", activeLabel.length > 0, activeLabel[0]?.slug ?? "none");

const brandRow = await db.select({ id: brands.id }).from(brands).limit(1);
check("at least one brand exists to attach a test product to", brandRow.length > 0);

// 3. Throwaway product + two labels (one active, one inactive) to exercise the
//    public filter and the cascade.
const [testProduct] = await db
  .insert(products)
  .values({
    name: `T label product ${stamp}`,
    slug: `t-label-product-${stamp}`,
    brand_id: brandRow[0].id,
    status: "published",
  })
  .returning({ id: products.id });

const [testActive, testInactive] = await db
  .insert(productLabels)
  .values([
    { name: `T active ${stamp}`, slug: tSlug("T active"), status: "active", display_order: 90 },
    { name: `T inactive ${stamp}`, slug: tSlug("T inactive"), status: "inactive", display_order: 91 },
  ])
  .returning({ id: productLabels.id, slug: productLabels.slug });

await db
  .insert(productLabelAssignments)
  .values([
    { product_id: testProduct.id, label_id: testActive.id, display_order: 0 },
    { product_id: testProduct.id, label_id: testInactive.id, display_order: 1 },
  ]);

let duplicateRejected = false;
try {
  await db
    .insert(productLabelAssignments)
    .values({ product_id: testProduct.id, label_id: testActive.id, display_order: 2 });
} catch {
  duplicateRejected = true;
}
check("duplicate (product, label) pair is rejected", duplicateRejected);

// 4. The detail page reads an active label for the product via the join.
const detailLabels = await db
  .select({ name: productLabels.name, slug: productLabels.slug })
  .from(productLabelAssignments)
  .innerJoin(productLabels, eq(productLabelAssignments.label_id, productLabels.id))
  .where(and(eq(productLabelAssignments.product_id, testProduct.id), eq(productLabels.status, "active")))
  .orderBy(asc(productLabelAssignments.display_order));
check("detail page join returns the active label", detailLabels.length === 1, detailLabels.map((l) => l.slug).join(" | "));
check("joined label is the active one, not the inactive", detailLabels[0]?.slug === testActive.slug);

// 5. The exact subquery the /products listing uses to filter by label.
const viaSubquery = await db
  .select({ id: products.id })
  .from(products)
  .where(
    and(
      eq(products.status, "published"),
      inArray(
        products.id,
        db
          .select({ product_id: productLabelAssignments.product_id })
          .from(productLabelAssignments)
          .innerJoin(productLabels, eq(productLabelAssignments.label_id, productLabels.id))
          .where(eq(productLabels.slug, testActive.slug)),
      ),
    ),
  );
check(
  "listing subquery matches exactly the labelled product",
  viaSubquery.length === 1 && viaSubquery[0].id === testProduct.id,
  `${viaSubquery.length} row(s)`,
);

const viaInactive = await db
  .select({ id: products.id })
  .from(products)
  .where(
    inArray(
      products.id,
      db
        .select({ product_id: productLabelAssignments.product_id })
        .from(productLabelAssignments)
        .innerJoin(productLabels, eq(productLabelAssignments.label_id, productLabels.id))
        .where(eq(productLabels.slug, testInactive.slug)),
    ),
  );
check("subquery can still target an inactive label by exact slug", viaInactive.length === 1);

// 6. Count must not be inflated by the join — a product with two labels
//    appearing once, which is what the listing's count() depends on.
const counted = await db
  .select({ value: sql<number>`count(*)` })
  .from(products)
  .where(
    inArray(
      products.id,
      db
        .select({ product_id: productLabelAssignments.product_id })
        .from(productLabelAssignments)
        .innerJoin(productLabels, eq(productLabelAssignments.label_id, productLabels.id))
        .where(eq(productLabels.slug, testActive.slug)),
    ),
  );
check("count() is not inflated by the label join", Number(counted[0]?.value ?? 0) === 1, String(counted[0]?.value));

// 7. Brand scoping of the label chips — the bug where a brand page listed every
//    label in the catalogue, including other brands' own. Asserted against the
//    real fetchLabelFacets rather than a copy, so a refactor cannot quietly drop
//    the brand condition. Membership is checked by membership, not by set
//    equality: the fixture brands may also carry real labels.
const facetLabelRows = await db
  .insert(productLabels)
  .values([
    { name: `T shared ${stamp}`, slug: tSlug("T shared"), status: "active", display_order: 80 },
    { name: `T only A ${stamp}`, slug: tSlug("T only A"), status: "active", display_order: 81 },
    { name: `T only B ${stamp}`, slug: tSlug("T only B"), status: "active", display_order: 82 },
  ])
  .returning({ id: productLabels.id, slug: productLabels.slug });
const [shared, onlyA, onlyB] = facetLabelRows;

const [testBrand] = await db
  .insert(brands)
  .values({ name: `T brand ${stamp}`, slug: tSlug("T brand"), display_order: 999 })
  .returning({ id: brands.id });

const facetProducts = await db
  .insert(products)
  .values([
    { name: `T a1 ${stamp}`, slug: `t-a1-${stamp}`, brand_id: brandRow[0].id, status: "published" },
    { name: `T a2 ${stamp}`, slug: `t-a2-${stamp}`, brand_id: brandRow[0].id, status: "published" },
    { name: `T a draft ${stamp}`, slug: `t-a-draft-${stamp}`, brand_id: brandRow[0].id, status: "draft" },
    { name: `T b1 ${stamp}`, slug: `t-b1-${stamp}`, brand_id: testBrand.id, status: "published" },
  ])
  .returning({ id: products.id });
const [a1, a2, aDraft, b1] = facetProducts;

await db.insert(productLabelAssignments).values([
  { product_id: a1.id, label_id: shared.id, display_order: 0 },
  { product_id: a1.id, label_id: onlyA.id, display_order: 1 },
  { product_id: a2.id, label_id: shared.id, display_order: 0 },
  { product_id: aDraft.id, label_id: shared.id, display_order: 0 },
  { product_id: b1.id, label_id: shared.id, display_order: 0 },
  { product_id: b1.id, label_id: onlyB.id, display_order: 1 },
]);

const brandA = await db.select({ slug: brands.slug }).from(brands).where(eq(brands.id, brandRow[0].id));
const brandASlug = brandA[0]?.slug ?? "";
const facetsA = await fetchLabelFacets(db, brandASlug);
const facetsB = await fetchLabelFacets(db, tSlug("T brand"));
const facetsAll = await fetchLabelFacets(db, "");
const facetsUnknown = await fetchLabelFacets(db, tSlug("T no such brand"));
const totalFor = (facets: { slug: string; total: number }[], slug: string) =>
  facets.find((f) => f.slug === slug)?.total;

check("brand A facets offer A's own label", totalFor(facetsA, onlyA.slug) !== undefined);
check("brand A facets exclude B's label", totalFor(facetsA, onlyB.slug) === undefined, facetsA.map((f) => f.slug).join(" | "));
check("brand B facets offer B's own label", totalFor(facetsB, onlyB.slug) !== undefined);
check("brand B facets exclude A's label", totalFor(facetsB, onlyA.slug) === undefined, facetsB.map((f) => f.slug).join(" | "));

// The regression itself: a shared label counted per brand, not globally.
check("shared label count is scoped to the brand", totalFor(facetsA, shared.slug) === 2, String(totalFor(facetsA, shared.slug)));
check("shared label count is scoped to the other brand", totalFor(facetsB, shared.slug) === 1, String(totalFor(facetsB, shared.slug)));
check("draft products are not counted", totalFor(facetsAll, shared.slug) === 3, String(totalFor(facetsAll, shared.slug)));
check("brandless facets are unscoped", facetsAll.length >= 3, `${facetsAll.length} label(s)`);
check("unknown brand yields no facets, matching its empty grid", facetsUnknown.length === 0, facetsUnknown.map((f) => f.slug).join(" | "));
check("inactive labels never appear in facets", facetsAll.every((f) => f.slug !== testInactive.slug));

// 8. Cascade: deleting the product must remove its assignments.
await db.delete(products).where(eq(products.id, testProduct.id));
const orphans = await db
  .select({ product_id: productLabelAssignments.product_id })
  .from(productLabelAssignments)
  .where(eq(productLabelAssignments.product_id, testProduct.id));
check("deleting a product cascades its label assignments", orphans.length === 0, `${orphans.length} orphan(s)`);

// 9. Cascade on the label side too.
const [cascadeProduct] = await db
  .insert(products)
  .values({ name: `T cascade ${stamp}`, slug: `t-cascade-${stamp}`, brand_id: brandRow[0].id, status: "published" })
  .returning({ id: products.id });
await db.insert(productLabelAssignments).values({ product_id: cascadeProduct.id, label_id: testActive.id });
await db.delete(productLabels).where(eq(productLabels.id, testActive.id));
const labelOrphans = await db
  .select({ product_id: productLabelAssignments.product_id })
  .from(productLabelAssignments)
  .where(eq(productLabelAssignments.label_id, testActive.id));
check("deleting a label cascades its assignments", labelOrphans.length === 0, `${labelOrphans.length} orphan(s)`);

// 10. Seeded rows must be untouched by the test cleanup.
const seeded = await db
  .select({ slug: productLabels.slug, status: productLabels.status })
  .from(productLabels)
  .where(sql`${productLabels.slug} not like 't-%'`);
check("seeded labels are present", seeded.length > 0, `${seeded.length} seeded`);
const dupes = seeded.map((r) => r.slug).filter((s, i, a) => a.indexOf(s) !== i);
check("seeded labels have no duplicate slugs", dupes.length === 0, dupes.join(" | "));

// cleanup. Scoped to the exact ids this run created rather than a slug
// wildcard, so a real label or product can never be caught by the cleanup, and
// the post-check looks only at those ids — a blanket row count starts failing
// the moment real labels are assigned through the admin.
const testLabelIds = [testActive.id, testInactive.id, shared.id, onlyA.id, onlyB.id];
const testProductIds = [testProduct.id, cascadeProduct.id, a1.id, a2.id, aDraft.id, b1.id];

await db.delete(products).where(inArray(products.id, testProductIds));
await db.delete(productLabels).where(inArray(productLabels.id, testLabelIds));
await db.delete(brands).where(eq(brands.id, testBrand.id));

const leftLabels = await db.select({ id: productLabels.id }).from(productLabels).where(inArray(productLabels.id, testLabelIds));
const leftAssignments = await db
  .select({ label_id: productLabelAssignments.label_id })
  .from(productLabelAssignments)
  .where(inArray(productLabelAssignments.label_id, testLabelIds));
check("cleanup removed all test labels", leftLabels.length === 0, `${leftLabels.length} left`);
check("no assignments remain referencing a test label", leftAssignments.length === 0, `${leftAssignments.length} left`);

const leftBrand = await db.select({ id: brands.id }).from(brands).where(eq(brands.id, testBrand.id));
check("cleanup removed the test brand", leftBrand.length === 0, `${leftBrand.length} left`);

// Real assignments must survive the cleanup untouched.
const realAssignments = await db
  .select({ total: sql<number>`count(*)` })
  .from(productLabelAssignments)
  .where(sql`${productLabelAssignments.label_id} not in ${testLabelIds}`);
check("real label assignments survive cleanup", Number(realAssignments[0]?.total ?? 0) > 0, `${realAssignments[0]?.total ?? 0} real row(s)`);

// The pool holds sockets open; closing it before exit avoids a libuv assertion
// failure on Windows teardown.
const { pool } = await import("../lib/db");
await pool.end();

console.log(failures === 0 ? "\nALL DB CHECKS PASSED" : `\n${failures} DB CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
