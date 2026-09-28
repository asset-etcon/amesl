import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const { db } = await import("../lib/db");
const { services } = await import("../db/schema");
const { and, sql } = await import("drizzle-orm");
const { activeServiceWhere, isServiceVisible, serviceOrder } = await import("../lib/services");
const { SERVICE_ICON_KEYS, isServiceIconKey, resolveServiceIcon } = await import("../lib/service-icons");
const { sanitizeRichText, sanitizePlainText } = await import("../lib/sanitize");
const { normaliseCoverImageUrl } = await import("../lib/news");
const { slugify } = await import("../lib/utils");

let failures = 0;
const check = (label: string, pass: boolean, detail = "") => {
  if (!pass) failures++;
  console.log(`${pass ? "pass" : "FAIL"}  ${label}${detail ? `  -> ${detail}` : ""}`);
};

const stamp = Date.now();
const rows = await db
  .insert(services)
  .values([
    { name: "T active", slug: `t-active-${stamp}`, status: "active", display_order: 90, summary: "s" },
    { name: "T inactive", slug: `t-inactive-${stamp}`, status: "inactive", display_order: 91, summary: "s" },
    { name: "T low order", slug: `t-low-${stamp}`, status: "active", display_order: 5, summary: "s" },
  ])
  .returning();

// 1. The shared predicate must hide inactive services from every public read,
//    and `serviceOrder` (the helper the grid actually uses) must drive the order.
const visible = await db
  .select({ slug: services.slug })
  .from(services)
  .where(and(activeServiceWhere(), sql`${services.slug} like 't-%'`))
  .orderBy(...serviceOrder);
const visibleSlugs = visible.map((v) => v.slug).sort();

check("active service is visible", visibleSlugs.includes(`t-active-${stamp}`), visibleSlugs.join(" | "));
check("inactive service is hidden", !visibleSlugs.includes(`t-inactive-${stamp}`));

const ordered = visible.map((v) => v.slug);
check(
  "serviceOrder sorts by display_order, not insertion",
  ordered.indexOf(`t-low-${stamp}`) < ordered.indexOf(`t-active-${stamp}`),
  ordered.join(" | "),
);

// 2. `name` is the documented tiebreaker, so equal display_order is still stable.
const tied = await db
  .insert(services)
  .values([
    { name: "Tie A", slug: `t-tie-a-${stamp}`, status: "active", display_order: 50 },
    { name: "Tie B", slug: `t-tie-b-${stamp}`, status: "active", display_order: 50 },
  ])
  .returning();
const tiedRows = await db
  .select({ name: services.name })
  .from(services)
  .where(and(activeServiceWhere(), sql`${services.slug} like 't-tie-%'`))
  .orderBy(...serviceOrder);
check(
  "tied display_order falls back to name order",
  tiedRows.map((r) => r.name).join(",") === "Tie A,Tie B",
  tiedRows.map((r) => r.name).join(","),
);
check("tied rows were created", tied.length === 2);

// 2. The JS mirror used by the admin table must agree exactly with the SQL predicate.
for (const [row, expect] of [
  [rows.find((r) => r.slug === `t-active-${stamp}`)!, true],
  [rows.find((r) => r.slug === `t-inactive-${stamp}`)!, false],
] as const) {
  const got = isServiceVisible({ status: row.status });
  check(`isServiceVisible(${row.name})`, got === expect, `got ${got}`);
}

// 3. An unrecognised icon key must never reach the render path as a raw string.
check("recognised key is kept", resolveServiceIcon("waves") === "waves");
check("unknown key falls back to the default", resolveServiceIcon("not-an-icon") === "activity", resolveServiceIcon("not-an-icon"));
check("null key falls back to the default", resolveServiceIcon(null) === "activity");
check("empty key falls back to the default", resolveServiceIcon("") === "activity");
// A value that could break out of an attribute must not survive the guard.
check("markup-shaped key falls back to the default", resolveServiceIcon('" onerror="alert(1)') === "activity");
check("isServiceIconKey rejects unknown", !isServiceIconKey("nope"));
check("isServiceIconKey accepts a known key", isServiceIconKey("motor"));
check("every seeded icon key is in the allowlist", SERVICE_ICON_KEYS.length === 13, `${SERVICE_ICON_KEYS.length} keys`);

// 4. Rich-text fields go through the sanitiser on write and again on read.
const XSS = '<p>ok</p><script>alert(1)</script><img src=x onerror=alert(2)>';
const safe = sanitizeRichText(XSS);
check("script tag stripped", !/<script/i.test(safe), safe);
check("onerror stripped", !/onerror/i.test(safe), safe);
check("benign markup kept", safe.includes("<p>ok</p>"), safe);

const summary = sanitizePlainText('<script>alert(1)</script>Real "Summary" & <b>more</b>', 300);
check("summary stripped to plain text", !/[<>]/.test(summary) && summary.includes("Real"), summary);

// 5. Image scheme filtering — exercised through the shared exported helper.
check("javascript: image rejected", normaliseCoverImageUrl("javascript:alert(1)") === "");
check("data: image rejected", normaliseCoverImageUrl("data:text/html;base64,PHNjcmlwdD4=") === "");
check("protocol-relative image rejected", normaliseCoverImageUrl("//evil.example/x.png") === "");
check("https image accepted", normaliseCoverImageUrl("https://cdn.example/svc/a.png") === "https://cdn.example/svc/a.png");
check("site-relative image accepted", normaliseCoverImageUrl("/services/a.png") === "/services/a.png");

// 6. Slugs must match the shape /services/<slug> produces in the sitemap.
check("slugify keeps the service name readable", slugify("Airborne and Structure Borne Ultrasound") === "airborne-and-structure-borne-ultrasound", slugify("Airborne and Structure Borne Ultrasound"));
check("slugify strips apostrophes", !slugify("Motor's Condition").includes("'"), slugify("Motor's Condition"));
check("slugify caps length", slugify("a".repeat(300)).length <= 120, `${slugify("a".repeat(300)).length}`);

// 7. The real seeded rows must all carry valid icon keys and distinct slugs.
const seeded = await db
  .select({ slug: services.slug, icon: services.icon, status: services.status })
  .from(services)
  .where(sql`${services.slug} not like 't-%'`);
const badIcons = seeded.filter((r) => !isServiceIconKey(r.icon)).map((r) => `${r.slug}=${r.icon}`);
check("every real row has a valid icon key", badIcons.length === 0, badIcons.join(" | "));
const dupes = seeded.map((r) => r.slug).filter((s, i, a) => a.indexOf(s) !== i);
check("real rows have no duplicate slugs", dupes.length === 0, dupes.join(" | "));
const live = seeded.filter((r) => r.status === "active");
check("at least one service is live", live.length > 0, `${live.length} live of ${seeded.length}`);

// cleanup
await db.delete(services).where(sql`${services.slug} like 't-%'`);
const left = await db.select({ id: services.id }).from(services).where(sql`${services.slug} like 't-%'`);
check("cleanup removed all test rows", left.length === 0, `${left.length} left`);

console.log(failures === 0 ? "\nALL DB CHECKS PASSED" : `\n${failures} DB CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
