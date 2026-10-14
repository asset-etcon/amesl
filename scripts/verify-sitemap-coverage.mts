import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const { db, pool } = await import("../lib/db");
const { brands, products } = await import("../db/schema");
const { and, eq, sql } = await import("drizzle-orm");
const { default: buildSitemap } = await import("../app/sitemap");

let failures = 0;
const check = (label: string, pass: boolean, detail = "") => {
  if (!pass) failures++;
  console.log(`${pass ? "pass" : "FAIL"}  ${label}${detail ? `  ->  ${detail}` : ""}`);
};

// Run the real route handler, so this asserts on exactly what Next serves rather
// than on a reimplementation of the queries that could drift from it.
const entries = await buildSitemap();
const locs = entries.map((e) => e.url);
const origin = (process.env.SITE_URL ?? "https://assetmatrixenergy.com").replace(/\/+$/, "");

console.log(`sitemap produced ${entries.length} URLs\n`);

// 1. No duplicates: a repeated URL wastes crawl budget and hides a bad join.
const dupes = locs.filter((l, i) => locs.indexOf(l) !== i);
check("no duplicate URLs", dupes.length === 0, dupes.length ? [...new Set(dupes)].join(", ") : "");

// 2. Every published product is listed, exactly once, and nothing else is.
const published = await db
  .select({ slug: products.slug, brand: brands.slug })
  .from(products)
  .innerJoin(brands, eq(products.brand_id, brands.id))
  .where(and(eq(products.status, "published"), eq(brands.status, "active")));

const expectedProducts = new Set(published.map((p) => `${origin}/products/${p.brand}/${p.slug}`));
const actualProducts = new Set(locs.filter((l) => l.startsWith(`${origin}/products/`) && !l.includes("?")));

const missing = [...expectedProducts].filter((u) => !actualProducts.has(u));
const extra = [...actualProducts].filter((u) => !expectedProducts.has(u));
check(
  `all ${expectedProducts.size} published products listed`,
  missing.length === 0,
  missing.length ? `${missing.length} missing, e.g. ${missing.slice(0, 3).join(", ")}` : "",
);
check(
  "no phantom product URLs",
  extra.length === 0,
  extra.length ? `${extra.length} extra, e.g. ${extra.slice(0, 3).join(", ")}` : "",
);

// 3. Only brands with a product are listed. An empty `?brand=` page is the
//    "No products found" state, and 26 of 29 brands were in that state once.
const brandCounts = await db
  .select({ slug: brands.slug, n: sql<string>`count(${products.id})::text` })
  .from(brands)
  .leftJoin(products, and(eq(products.brand_id, brands.id), eq(products.status, "published")))
  .where(eq(brands.status, "active"))
  .groupBy(brands.id, brands.slug);

const emptyBrands = new Set(brandCounts.filter((b) => Number(b.n) === 0).map((b) => b.slug));
const listedBrands = locs.filter((l) => l.includes("?brand=")).map((l) => new URL(l).searchParams.get("brand")!);

const listedEmpty = listedBrands.filter((b) => emptyBrands.has(b));
check(
  `no empty brand URLs listed (${emptyBrands.size} brands have 0 published products)`,
  listedEmpty.length === 0,
  listedEmpty.length ? listedEmpty.slice(0, 5).join(", ") : "",
);

const expectedBrands = brandCounts.filter((b) => Number(b.n) > 0).map((b) => b.slug);
const missingBrands = expectedBrands.filter((b) => !listedBrands.includes(b));
check(
  `all ${expectedBrands.length} non-empty brand landings listed`,
  missingBrands.length === 0,
  missingBrands.length ? missingBrands.join(", ") : "",
);

// 4. Every lastModified is a valid W3C dateTime. Google rejects the whole file
//    otherwise, which is how this sitemap was broken once already.
const W3C = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const badDates = entries.map((e) => e.lastModified).filter((d) => typeof d !== "string" || !W3C.test(d));
check("every lastModified is a valid W3C dateTime", badDates.length === 0, badDates.slice(0, 3).join(", "));

console.log(
  `\nsitemap: ${entries.length} URLs = ${entries.filter((e) => !e.url.includes("?")).length} plain + ` +
    `${locs.filter((l) => l.includes("?brand=")).length} brand landings`,
);

await pool.end();
process.exit(failures ? 1 : 0);
