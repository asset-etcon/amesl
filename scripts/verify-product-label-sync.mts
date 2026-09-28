/**
 * Exercises the save path for label assignment: the select-then-delete-orphans
 * logic of `syncLabels` in the product admin action. Verifies a full
 * add / reorder / remove / clear cycle on one product, plus the reuse of a
 * single label across products.
 *
 * `syncLabels` is module-private, so the body below mirrors it exactly; keep the
 * two in step. scripts/verify-product-labels.mts covers the database-level
 * invariants (constraints, cascades, the listing subquery) independently.
 *
 *   npx tsx scripts/verify-product-label-sync.mts
 */
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const { db, pool } = await import("../lib/db");
const { brands, productLabels, productLabelAssignments, products } = await import("../db/schema");
const { and, asc, eq, inArray } = await import("drizzle-orm");
const { slugify } = await import("../lib/utils");

let failures = 0;
const check = (label: string, pass: boolean, detail = "") => {
  if (!pass) failures++;
  console.log(`${pass ? "pass" : "FAIL"}  ${label}${detail ? `  -> ${detail}` : ""}`);
};

const stamp = Date.now();

// syncLabels is module-private in the product action, so this mirrors its exact
// body. If that function changes, this copy must change with it — the
// verify-product-labels script covers the database-level invariants.
async function syncLabels(productId: string, labelIds: string[]) {
  const wanted = [...new Set(labelIds.filter(Boolean))];

  const existing = await db
    .select({ label_id: productLabelAssignments.label_id })
    .from(productLabelAssignments)
    .where(eq(productLabelAssignments.product_id, productId));
  const existingIds = new Set(existing.map((r) => r.label_id));

  const removed = existing.map((r) => r.label_id).filter((id) => !wanted.includes(id));
  if (removed.length) {
    await db
      .delete(productLabelAssignments)
      .where(and(eq(productLabelAssignments.product_id, productId), inArray(productLabelAssignments.label_id, removed)));
  }

  const inserts = wanted.filter((id) => !existingIds.has(id)).map((label_id, i) => ({ product_id: productId, label_id, display_order: i }));
  if (inserts.length) await db.insert(productLabelAssignments).values(inserts);

  for (const [i, id] of wanted.entries()) {
    await db
      .update(productLabelAssignments)
      .set({ display_order: i })
      .where(and(eq(productLabelAssignments.product_id, productId), eq(productLabelAssignments.label_id, id)));
  }
}

const assigned = async (productId: string) =>
  db
    .select({ slug: productLabels.slug, display_order: productLabelAssignments.display_order })
    .from(productLabelAssignments)
    .innerJoin(productLabels, eq(productLabelAssignments.label_id, productLabels.id))
    .where(eq(productLabelAssignments.product_id, productId))
    .orderBy(asc(productLabelAssignments.display_order));

const brandRow = await db.select({ id: brands.id }).from(brands).limit(1);
const labels = await db
  .insert(productLabels)
  .values([
    { name: `T one ${stamp}`, slug: `${slugify(`T one ${stamp}`)}`, display_order: 80 },
    { name: `T two ${stamp}`, slug: `${slugify(`T two ${stamp}`)}`, display_order: 81 },
    { name: `T three ${stamp}`, slug: `${slugify(`T three ${stamp}`)}`, display_order: 82 },
  ])
  .returning({ id: productLabels.id, slug: productLabels.slug });
const [l1, l2, l3] = labels;

const [testProduct] = await db
  .insert(products)
  .values({ name: `T sync ${stamp}`, slug: `t-sync-${stamp}`, brand_id: brandRow[0].id, status: "published" })
  .returning({ id: products.id });

// 1. Assign all three.
await syncLabels(testProduct.id, [l1.id, l2.id, l3.id]);
let rows = await assigned(testProduct.id);
check("assigns three labels", rows.length === 3, rows.map((r) => r.display_order).join(","));
check("display order follows the submitted order", rows.map((r) => r.display_order).join(",") === "0,1,2", rows.map((r) => r.display_order).join(","));

// 2. Reorder only — same set, different order. Must not duplicate or drop rows.
await syncLabels(testProduct.id, [l3.id, l1.id, l2.id]);
rows = await assigned(testProduct.id);
check("reorder keeps exactly three rows", rows.length === 3, String(rows.length));
check("reorder persists the new sequence", rows.map((r) => r.slug).join(",") === `${l3.slug},${l1.slug},${l2.slug}`, rows.map((r) => r.slug).join(","));
check("reorder renumbers from zero", rows.map((r) => r.display_order).join(",") === "0,1,2", rows.map((r) => r.display_order).join(","));

// 3. Remove one.
await syncLabels(testProduct.id, [l1.id, l3.id]);
rows = await assigned(testProduct.id);
check("removing a label deletes only that row", rows.length === 2 && !rows.some((r) => r.slug === l2.slug), rows.map((r) => r.slug).join(","));
check("survivors are renumbered contiguously", rows.map((r) => r.display_order).join(",") === "0,1", rows.map((r) => r.display_order).join(","));

// 4. Duplicate ids in the payload collapse to one row.
await syncLabels(testProduct.id, [l1.id, l1.id, l1.id]);
rows = await assigned(testProduct.id);
check("duplicate ids in one payload collapse to a single row", rows.length === 1, `${rows.length} row(s)`);

// 5. Empty payload clears every assignment.
await syncLabels(testProduct.id, []);
rows = await assigned(testProduct.id);
check("empty payload clears all assignments", rows.length === 0, `${rows.length} left`);

// 6. The same label on two different products is allowed — the composite key is
//    per product, not global.
const [other] = await db
  .insert(products)
  .values({ name: `T sync b ${stamp}`, slug: `t-sync-b-${stamp}`, brand_id: brandRow[0].id, status: "published" })
  .returning({ id: products.id });
await syncLabels(testProduct.id, [l1.id]);
await syncLabels(other.id, [l1.id]);
const both = await db
  .select({ product_id: productLabelAssignments.product_id })
  .from(productLabelAssignments)
  .where(eq(productLabelAssignments.label_id, l1.id));
check("one label can span many products", both.length === 2, `${both.length} product(s)`);

// Cleanup scoped to the exact ids this run created, never a slug wildcard:
// the catalogue holds real labels and products, and a `like 't-sync%'` delete
// would eventually catch one of them.
const testLabelIds = [l1, l2, l3].map((l) => l.id);
await db.delete(products).where(inArray(products.id, [testProduct.id, other.id]));
await db.delete(productLabels).where(inArray(productLabels.id, testLabelIds));
const left = await db
  .select({ label_id: productLabelAssignments.label_id })
  .from(productLabelAssignments)
  .where(inArray(productLabelAssignments.label_id, testLabelIds));
check("cleanup removed all test rows", left.length === 0, `${left.length} left`);

await pool.end();
console.log(failures === 0 ? "\nALL SYNC CHECKS PASSED" : `\n${failures} SYNC CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
