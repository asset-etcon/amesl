/**
 * Reads the nine real seeded rows back out of the database and checks that the
 * rich text each public detail page will render survives sanitisation intact.
 *
 * The seed writes HTML directly to the database rather than through the admin
 * server action, so this is the one place that content bypasses the write-path
 * sanitiser. If the tags used in sql/seed.sql are not on the allowlist the copy
 * would be silently stripped on first render, and the only symptom would be a
 * visually degraded page.
 */
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const { db } = await import("../lib/db");
const { services } = await import("../db/schema");
const { asc } = await import("drizzle-orm");
const { sanitizeRichText, sanitizePlainText } = await import("../lib/sanitize");

let failures = 0;
const check = (label: string, pass: boolean, detail = "") => {
  if (!pass) failures++;
  console.log(`${pass ? "pass" : "FAIL"}  ${label}${detail ? `  -> ${detail}` : ""}`);
};

const rows = await db
  .select({
    name: services.name,
    slug: services.slug,
    summary: services.summary,
    overview: services.overview,
    seo_title: services.seo_title,
    seo_description: services.seo_description,
  })
  .from(services)
  .orderBy(asc(services.display_order));

check("nine services present", rows.length === 9, `${rows.length} rows`);

for (const row of rows) {
  const raw = row.overview ?? "";
  const clean = sanitizeRichText(raw);
  // Losing markup is fine; losing the words is not. Compare on text content.
  const textOf = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&\w+;/g, " ").replace(/\s+/g, " ").trim();
  const kept = textOf(clean);
  const original = textOf(raw);
  check(
    `${row.slug} :: overview keeps its copy`,
    kept.length > 40 && kept === original,
    `${original.length} chars in, ${kept.length} kept`,
  );

  // The overview is the whole body of the page, so it is expected to carry
  // structure, not flat prose: subheadings for the sub-topics and a bulleted list
  // for what the service detects or covers. A regression to plain paragraphs
  // passes the copy check above but fails here, which is the point.
  check(`${row.slug} :: overview keeps its subheadings`, /<h2[\s>]/i.test(clean), clean.slice(0, 70));
  check(`${row.slug} :: overview keeps its bulleted list`, /<ul[\s>][\s\S]*<li[\s>]/i.test(clean));
  // A service page body should be substantive. The old three-section layout
  // carried 1,700-2,300 chars here; after folding them in the target is at least
  // that, so a truncated or half-written overview is caught here.
  check(`${row.slug} :: overview is substantial`, original.length >= 1500, `${original.length} chars`);

  check(`${row.slug} :: summary is present`, (row.summary ?? "").length > 40, `${(row.summary ?? "").length} chars`);
  check(`${row.slug} :: seo_title fits 60`, (row.seo_title ?? "").length > 0 && (row.seo_title ?? "").length <= 60, `${(row.seo_title ?? "").length}`);
  check(`${row.slug} :: seo_description fits 160`, (row.seo_description ?? "").length > 0 && (row.seo_description ?? "").length <= 160, `${(row.seo_description ?? "").length}`);

  // The name is interpolated into <title> and JSON-LD, so it must be inert.
  check(`${row.slug} :: name is plain text`, !/[<>]/.test(sanitizePlainText(row.name, 160)), row.name);
}

console.log(failures === 0 ? "\nSEED CONTENT CHECKS PASSED" : `\n${failures} SEED CONTENT CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
