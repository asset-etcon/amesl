import type { MetadataRoute } from "next";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { brands, newsCategories, newsPosts, products, services } from "@/db/schema";
import { activeNewsCategoryWhere, newsOrder, publishedNewsWhere } from "@/lib/news";
import { activeServiceWhere, serviceOrder } from "@/lib/services";
import { toIsoTimestamp } from "@/lib/dates";

const siteUrl = (process.env.SITE_URL ?? "https://assetmatrixenergy.com").replace(/\/+$/, "");

/**
 * Crawlers re-request this on a schedule, and Aiven has a very small connection
 * pool, so the whole sitemap is served from one short-lived render and
 * regenerated at most once per hour. A news post that publishes mid-interval is
 * picked up by the sitemap's own revalidation after the action's
 * `revalidatePath("/sitemap.xml")`, which fires the moment an editor publishes.
 *
 * Fifteen minutes, not an hour: an editor publishing or archiving a product needs
 * it to reach Google promptly. At 77 URLs this is still a trivial amount of work.
 */
export const revalidate = 900;

type Entry = MetadataRoute.Sitemap[number];

const url = (path: string): string => `${siteUrl}${path}`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // A single "now" for the whole render, so every entry in one response agrees
  // about which scheduled posts have gone live.
  const now = new Date();

  const [brandRows, productRows, postRows, newsCategoryRows, serviceRows] = await Promise.all([
    // The published-product count rides along with the brand so the `?brand=`
    // entries below can be limited to brands that actually have a grid to show.
    // `count()` returns bigint in Postgres, hence the String() coercion.
    db
      .select({
        slug: brands.slug,
        updated_at: brands.updated_at,
        published_count: sql<string>`count(${products.id})::text`,
      })
      .from(brands)
      .leftJoin(products, and(eq(products.brand_id, brands.id), eq(products.status, "published")))
      .where(eq(brands.status, "active"))
      .groupBy(brands.id, brands.slug, brands.updated_at),
    // Product URLs are keyed by brand as well as slug, so the brand is needed
    // here; products whose brand is missing or inactive are omitted rather than
    // emitting a URL that redirects. No limit or offset: every published product
    // must appear, and an earlier revision silently truncated this to the first
    // page, which is why 58 live products were missing from the sitemap.
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
    // Only active services: a deactivated one 404s, and listing it here would
    // hand crawlers a URL that does not resolve.
    db.select({ slug: services.slug, updated_at: services.updated_at }).from(services).where(activeServiceWhere()).orderBy(...serviceOrder),
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

  // Every lastModified below goes through toIsoTimestamp: the `timestamptz`
  // columns arrive as Postgres text ("2026-09-23 16:18:44.799753+00"), which is
  // not a valid W3C dateTime and makes Google reject the whole sitemap.
  const newsEntries: Entry[] = postRows.map((post) => ({
    url: url(`/news/${post.slug}`),
    // For a scheduled post the scheduled instant is the meaningful date.
    lastModified: toIsoTimestamp(post.updated_at ?? post.publish_at ?? post.created_at, nowIso),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    ...staticRoutes,
    ...serviceRows.map((row) => ({
      url: url(`/services/${row.slug}`),
      // Through toIsoTimestamp: a raw `timestamptz` arrives as Postgres text
      // ("2026-09-23 16:18:44.799753+00"), which Google rejects as a lastModified.
      lastModified: toIsoTimestamp(row.updated_at, nowIso),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...newsEntries,
    ...newsCategoryRows.map((row) => ({
      url: url(`/news/category/${row.slug}`),
      lastModified: toIsoTimestamp(row.updated_at, nowIso),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...brandRows
      // A brand with no published products renders the "No products found" empty
      // state. Listing those URLs asks Google to index a page with no content, and
      // 26 of the 29 brands were in that state - a third of the sitemap was
      // empty pages, which reads as crawl waste and drags down the whole domain.
      // They are `noindex` in generateMetadata, so they must not be listed here.
      .filter((row) => Number(row.published_count) > 0)
      .map((row) => ({
        url: url(`/products?brand=${row.slug}`),
        lastModified: toIsoTimestamp(row.updated_at, nowIso),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      })),
    ...productRows.map((row) => ({
      url: url(`/products/${row.brand_slug}/${row.slug}`),
      lastModified: toIsoTimestamp(row.updated_at, nowIso),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    // `?brand=` is listed because it renders a real, distinct brand landing page.
    // The other catalogue parameters are deliberately omitted: `?q=`, `?sort=`
    // and `?page=` generate near-duplicate listings that only dilute crawl
    // budget, and search engines already treat them as facets of /products.
  ];
}
