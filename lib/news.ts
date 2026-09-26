import { and, desc, eq, isNull, lte, or, sql, type SQL } from "drizzle-orm";
import { newsPosts, newsCategories } from "@/db/schema";

/**
 * The one definition of "a news post is publicly visible".
 *
 * Every public read — the listing, a post page, a category page, the homepage
 * band, the sitemap and the OG image — MUST use this predicate. If any of them
 * re-derives the rule it can drift, and the usual failure is a scheduled post
 * leaking early.
 *
 * `publish_at IS NULL` means "publish immediately"; a future timestamp holds the
 * post back until that instant has passed.
 */
export function publishedNewsWhere(now: Date = new Date()): SQL {
  // Timestamps are modelled as strings throughout db/schema.ts, so the cutoff is
  // compared as an ISO instant rather than a JS Date.
  return and(
    eq(newsPosts.status, "published"),
    or(isNull(newsPosts.publish_at), lte(newsPosts.publish_at, now.toISOString())),
  )!;
}

/** A post is visible when published and not held back by a future schedule. */
export function isNewsVisible(post: { status: string; publish_at: string | Date | null }, now: Date = new Date()): boolean {
  if (post.status !== "published") return false;
  if (!post.publish_at) return true;
  return new Date(post.publish_at).getTime() <= now.getTime();
}

/** The instant a post becomes publicly visible, used for `<time datetime>` and the sitemap. */
export function newsPublishedAt(post: { publish_at: string | Date | null; created_at: string | Date }): Date {
  return new Date(post.publish_at ?? post.created_at);
}

/**
 * Newest first, treating a scheduled post as if it had published on its
 * scheduled date.
 *
 * The `coalesce` is essential: Postgres sorts NULLs *first* under `DESC`, so a
 * plain `desc(publish_at)` would put every never-scheduled post above every
 * scheduled one regardless of age. Coalescing to `created_at` makes an
 * immediately-published post sort by when it was written, and interleaves
 * correctly with dated posts.
 */
export const newsOrder = [desc(sql`coalesce(${newsPosts.publish_at}, ${newsPosts.created_at})`)];

/** A category is publicly listed only while active. */
export function activeNewsCategoryWhere(): SQL {
  return eq(newsCategories.status, "active")!;
}

/**
 * Accepts only site-relative paths and absolute http(s) URLs, returning "" for
 * anything else.
 *
 * `cover_image` is written into an `<img src>`, an `og:image` tag and an
 * `ImageResponse` fetch. An unvalidated value would let a stored `javascript:`
 * or `data:` URL through, so the scheme is checked here rather than trusted from
 * the client.
 */
export function normaliseCoverImageUrl(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}
