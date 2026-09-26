import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const { db } = await import("../lib/db");
const { newsPosts, newsCategories } = await import("../db/schema");
const { eq, and, sql } = await import("drizzle-orm");
const { publishedNewsWhere, isNewsVisible, newsPublishedAt, newsOrder, normaliseCoverImageUrl } = await import("../lib/news");
const { sanitizeRichText, sanitizePlainText, jsonLdScript } = await import("../lib/sanitize");

let failures = 0;
const check = (label: string, pass: boolean, detail = "") => {
  if (!pass) failures++;
  console.log(`${pass ? "pass" : "FAIL"}  ${label}${detail ? `  -> ${detail}` : ""}`);
};

const now = new Date();
const future = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
const past = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

const [cat] = await db.insert(newsCategories).values({ name: "ZZ Temp Verify", slug: `zz-temp-verify-${Date.now()}` }).returning({ id: newsCategories.id });

const XSS = '<p>ok</p><script>alert(1)</script><img src=x onerror=alert(2)>';
const rows = await db
  .insert(newsPosts)
  .values([
    { title: "T draft", slug: `t-draft-${Date.now()}`, status: "draft", body: "draft", category_id: cat.id },
    { title: "T published immediate", slug: `t-imm-${Date.now()}`, status: "published", publish_at: null, body: "imm", category_id: cat.id },
    { title: "T scheduled future", slug: `t-fut-${Date.now()}`, status: "published", publish_at: future.toISOString(), body: "fut", category_id: cat.id },
    { title: "T scheduled past", slug: `t-past-${Date.now()}`, status: "published", publish_at: past.toISOString(), body: "past", category_id: cat.id },
    { title: "T archived", slug: `t-arch-${Date.now()}`, status: "archived", body: "arch", category_id: cat.id },
    { title: "T featured sched", slug: `t-feat-${Date.now()}`, status: "published", featured: true, publish_at: future.toISOString(), body: "feat", category_id: cat.id },
  ])
  .returning();

const byTitle = new Map(rows.map((r) => [r.title, r]));

// 1. The shared predicate must hide draft, future-scheduled and archived.
const visible = await db
  .select({ title: newsPosts.title })
  .from(newsPosts)
  .where(and(publishedNewsWhere(), sql`${newsPosts.slug} like 't-%'`));
const visibleTitles = visible.map((v) => v.title).sort();

check(
  "published+past+immediate are visible",
  JSON.stringify(visibleTitles) === JSON.stringify(["T published immediate", "T scheduled past"]),
  visibleTitles.join(" | "),
);
check("draft is hidden", !visibleTitles.includes("T draft"));
check("future-scheduled is hidden", !visibleTitles.includes("T scheduled future"));
check("future-scheduled FEATURED is hidden", !visibleTitles.includes("T featured sched"));
check("archived is hidden", !visibleTitles.includes("T archived"));

// 2. The JS mirror used by the admin table must agree exactly.
for (const [title, expectVisible] of [
  ["T draft", false],
  ["T published immediate", true],
  ["T scheduled future", false],
  ["T scheduled past", true],
  ["T archived", false],
  ["T featured sched", false],
] as const) {
  const r = byTitle.get(title)!;
  const got = isNewsVisible({ status: r.status, publish_at: r.publish_at }, now);
  check(`isNewsVisible(${title})`, got === expectVisible, `got ${got}`);
}

// 3. Ordering: coalesce(publish_at, created_at) must sort a future-scheduled
//    post above an older immediate post, and NULLs must not float to the top.
const ordered = await db
  .select({ title: newsPosts.title, publish_at: newsPosts.publish_at, created_at: newsPosts.created_at })
  .from(newsPosts)
  .where(sql`${newsPosts.slug} like 't-%'`)
  .orderBy(...newsOrder);
const topTitle = ordered[0]?.title;
const anyNullFirst = ordered.length > 0 && ordered[0].publish_at === null && ordered.some((r) => r.publish_at !== null);
check("future-scheduled sorts first", topTitle === "T scheduled future" || topTitle === "T featured sched", `top=${topTitle}`);
check("NULL publish_at does not float to the top", !anyNullFirst, `top publish_at=${ordered[0]?.publish_at}`);

// 4. newsPublishedAt falls back to created_at when publish_at is null.
const imm = byTitle.get("T published immediate")!;
check("newsPublishedAt falls back to created_at", newsPublishedAt({ publish_at: imm.publish_at, created_at: imm.created_at }).getTime() === new Date(imm.created_at).getTime());

// 5. Sanitizer on the real write path.
const safe = sanitizeRichText(XSS);
check("script tag stripped", !/<script/i.test(safe), safe);
check("onerror stripped", !/onerror/i.test(safe), safe);
check("benign markup kept", safe.includes("<p>ok</p>"), safe);

const titleText = sanitizePlainText('<script>alert(1)</script>Real "Title" & <b>more</b>', 50);
check("title stripped to plain text", !/[<>]/.test(titleText) && titleText.includes("Real"), titleText);

const ld = jsonLdScript({ headline: 'Evil</script><img src=x onerror=alert(1)>' });
check("json-ld cannot close the script element", !/<\/script/i.test(ld), ld);

// 6. Cover image scheme filtering — exercised through the real exported helper.
check("javascript: cover rejected", normaliseCoverImageUrl("javascript:alert(1)") === "");
check("data: cover rejected", normaliseCoverImageUrl("data:text/html;base64,PHNjcmlwdD4=") === "");
check("protocol-relative cover rejected", normaliseCoverImageUrl("//evil.example/x.png") === "");
check("https cover accepted", normaliseCoverImageUrl("https://cdn.example/news/a.png") === "https://cdn.example/news/a.png");
check("site-relative cover accepted", normaliseCoverImageUrl("/news/a.png") === "/news/a.png");
check("empty cover stays empty", normaliseCoverImageUrl("  ") === "");

// cleanup
await db.delete(newsPosts).where(sql`${newsPosts.slug} like 't-%'`);
await db.delete(newsCategories).where(eq(newsCategories.id, cat.id));
const left = await db.select({ id: newsPosts.id }).from(newsPosts).where(sql`${newsPosts.slug} like 't-%'`);
check("cleanup removed all test rows", left.length === 0, `${left.length} left`);

console.log(failures === 0 ? "\nALL DB CHECKS PASSED" : `\n${failures} DB CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
