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

// 7. Cascade: deleting the product must remove its assignments.
await db.delete(products).where(eq(products.id, testProduct.id));
const orphans = await db
  .select({ product_id: productLabelAssignments.product_id })
  .from(productLabelAssignments)
  .where(eq(productLabelAssignments.product_id, testProduct.id));
check("deleting a product cascades its label assignments", orphans.length === 0, `${orphans.length} orphan(s)`);

// 8. Cascade on the label side too.
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

// 9. Seeded rows must be untouched by the test cleanup.
const seeded = await db
  .select({ slug: productLabels.slug, status: productLabels.status })
  .from(productLabels)
  .where(sql`${productLabels.slug} not like 't-%'`);
check("seeded labels are present", seeded.length > 0, `${seeded.length} seeded`);
const dupes = seeded.map((r) => r.slug).filter((s, i, a) => a.indexOf(s) !== i);
check("seeded labels have no duplicate slugs", dupes.length === 0, dupes.join(" | "));

// cleanup
await db.delete(products).where(sql`${products.slug} like 't-%'`);
await db.delete(productLabels).where(sql`${productLabels.slug} like 't-%'`);
const leftLabels = await db.select({ id: productLabels.id }).from(productLabels).where(sql`${productLabels.slug} like 't-%'`);
const leftAssignments = await db.select({ label_id: productLabelAssignments.label_id }).from(productLabelAssignments);
check("cleanup removed all test labels", leftLabels.length === 0, `${leftLabels.length} left`);
check("no assignments remain referencing a test label", leftAssignments.length === 0, `${leftAssignments.length} left`);

// The pool holds sockets open; closing it before exit avoids a libuv assertion
// failure on Windows teardown.
const { pool } = await import("../lib/db");
await pool.end();

console.log(failures === 0 ? "\nALL DB CHECKS PASSED" : `\n${failures} DB CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
