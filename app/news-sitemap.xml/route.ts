import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsCategories, newsPosts } from "@/db/schema";
import { newsPublishedAt, publishedNewsWhere } from "@/lib/news";

const siteUrl = (process.env.SITE_URL ?? "https://assetmatrixenergy.com").replace(/\/+$/, "");

/**
 * Google News sitemap, kept separate from sitemap.xml because the two have
 * different vocabularies: this one uses the `news:` namespace and is the only
 * way an article can enter Google News, which for a domain this new is usually
 * the fastest route to a first index.
 *
 * Google only accepts articles from the last two days here, so anything older is
 * deliberately omitted rather than filtered at request time.
 */
export const revalidate = 3600;

const escapeXml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export async function GET(): Promise<Response> {
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      slug: newsPosts.slug,
      title: newsPosts.title,
      publish_at: newsPosts.publish_at,
      created_at: newsPosts.created_at,
      category: newsCategories.name,
    })
    .from(newsPosts)
    .leftJoin(newsCategories, eq(newsPosts.category_id, newsCategories.id))
    .where(publishedNewsWhere(now));

  // Older than Google's two-day window: drop them here rather than letting
  // Google report the whole file as containing stale entries.
  const recent = rows.filter((row) => newsPublishedAt(row).getTime() >= twoDaysAgo.getTime());

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${recent
  .map(
    (row) => `  <url>
    <loc>${escapeXml(`${siteUrl}/news/${row.slug}`)}</loc>
    <news:news>
      <news:publication>
        <news:name>Asset Matrix Energy</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${newsPublishedAt(row).toISOString()}</news:publication_date>
      <news:title>${escapeXml(row.title)}</news:title>${row.category ? `\n      <news:keywords>${escapeXml(row.category)}</news:keywords>` : ""}
    </news:news>
  </url>`,
  )
  .join("\n")}
</urlset>`;

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, must-revalidate",
    },
  });
}
