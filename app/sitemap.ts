import type { MetadataRoute } from "next";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { brands, newsCategories, newsPosts, products } from "@/db/schema";
import { activeNewsCategoryWhere, newsOrder, publishedNewsWhere } from "@/lib/news";

const siteUrl = (process.env.SITE_URL ?? "https://assetmatrixenergy.com").replace(/\/+$/, "");

/**
 * Crawlers re-request this on a schedule, and Aiven has a very small connection
 * pool, so the whole sitemap is served from one short-lived render and
 * regenerated at most once per hour. A news post that publishes mid-interval is
 * picked up by the sitemap's own revalidation after the action's
 * `revalidatePath("/sitemap.xml")`, which fires the moment an editor publishes.
 */
export const revalidate = 3600;

type Entry = MetadataRoute.Sitemap[number];

const url = (path: string): string => `${siteUrl}${path}`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // A single "now" for the whole render, so every entry in one response agrees
  // about which scheduled posts have gone live.
  const now = new Date();

  const [brandRows, productRows, postRows, newsCategoryRows] = await Promise.all([
    db
      .select({ slug: brands.slug, updated_at: brands.updated_at })
      .from(brands)
      .where(eq(brands.status, "active")),
    // Product URLs are keyed by brand as well as slug, so the brand is needed
    // here; products whose brand is missing or inactive are omitted rather than
    // emitting a URL that redirects.
    db
      .select({ slug: products.slug, updated_at: products.updated_at, brand_slug: brands.slug })
      .from(products)
      .innerJoin(brands, eq(products.brand_id, brands.id))
      .where(and(eq(products.status, "published"), eq(brands.status, "active"))),
    db
      .select({ slug: newsPosts.slug, publish_at: newsPosts.publish_at, created_at: newsPosts.created_at, updated_at: newsPosts.updated_at })
      .from(newsPosts)
      .where(publishedNewsWhere(now))
      .orderBy(...newsOrder),
    // From `news_categories`, NOT the product `categories` table: these become
    // /news/category/<slug> URLs, and the two slugsets are unrelated. Reading
    // the wrong table lists URLs that 404, which is what an earlier revision did.
    db.select({ slug: newsCategories.slug, updated_at: newsCategories.updated_at }).from(newsCategories).where(activeNewsCategoryWhere()),
  ]);

  const nowIso = now.toISOString();

  const staticRoutes: Entry[] = [
    { url: url("/"), lastModified: nowIso, changeFrequency: "weekly", priority: 1 },
    { url: url("/about"), lastModified: nowIso, changeFrequency: "monthly", priority: 0.5 },
    { url: url("/services"), lastModified: nowIso, changeFrequency: "monthly", priority: 0.8 },
    { url: url("/solutions"), lastModified: nowIso, changeFrequency: "monthly", priority: 0.8 },
    { url: url("/products"), lastModified: nowIso, changeFrequency: "weekly", priority: 0.9 },
    { url: url("/contact"), lastModified: nowIso, changeFrequency: "yearly", priority: 0.6 },
    { url: url("/news"), lastModified: nowIso, changeFrequency: "daily", priority: 0.8 },
  ];

  const newsEntries: Entry[] = postRows.map((post) => ({
    url: url(`/news/${post.slug}`),
    // For a scheduled post the scheduled instant is the meaningful date.
    lastModified: new Date(post.updated_at ?? post.publish_at ?? post.created_at).toISOString(),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    ...staticRoutes,
    ...newsEntries,
    ...newsCategoryRows.map((row) => ({
      url: url(`/news/category/${row.slug}`),
      lastModified: row.updated_at ?? nowIso,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...brandRows.map((row) => ({
      url: url(`/products?brand=${row.slug}`),
      lastModified: row.updated_at ?? nowIso,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...productRows.map((row) => ({
      url: url(`/products/${row.brand_slug}/${row.slug}`),
      lastModified: row.updated_at ?? nowIso,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    // `?brand=` is listed because it renders a real, distinct brand landing page.
    // The other catalogue parameters are deliberately omitted: `?q=`, `?sort=`
    // and `?page=` generate near-duplicate listings that only dilute crawl
    // budget, and search engines already treat them as facets of /products.
  ];
}
