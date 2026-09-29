/**
 * Shared read logic for news article comments.
 *
 * The visibility rule lives here rather than being written inline at each call
 * site, for the same reason lib/news.ts holds `publishedNewsWhere()`: a comment
 * is public only while it is `status = 'published'`, and if the article page, the
 * count and the verification script each re-derive that, they will drift and a
 * hidden comment will eventually reappear in one of them.
 *
 * Aiven allows only a handful of connections, so an article view is careful about
 * what it spends them on. `fetchPostComments` issues the list and the count as one
 * parallel pair, and callers are expected to skip the whole thing when the post
 * has `allow_comments` off — a closed article costs zero extra round trips.
 */
import { and, asc, count, eq, type SQL } from "drizzle-orm";
import { postComments } from "@/db/schema";
import type { Database } from "@/lib/db";

/** Comments shown per page on an article. */
export const COMMENTS_PER_PAGE = 20;

/**
 * The one definition of "a comment is publicly visible".
 *
 * Nothing else filters comments, and the only way to take one down in the UI is
 * to set its status to 'hidden', which this predicate then excludes.
 */
export function publishedCommentsWhere(): SQL {
  return eq(postComments.status, "published")!;
}

/**
 * Oldest first. A thread that reorders under the reader while they are reading
 * it is disorienting, and ascending `created_at` is the order the composite
 * (post_id, created_at) partial index already serves.
 */
export const commentOrder = [asc(postComments.created_at)];

export interface PostComment {
  id: string;
  author_name: string;
  body: string;
  created_at: string;
}

export interface PostCommentPage {
  comments: PostComment[];
  /** Published comments on the post, across all pages. */
  total: number;
  page: number;
  pageCount: number;
}

/**
 * One page of published comments plus the total needed for pagination and the
 * meta-row counter. `author_email` is deliberately absent: it is stored for
 * moderation and never leaves the admin.
 */
export async function fetchPostComments(db: Database, postId: string, page = 1): Promise<PostCommentPage> {
  const safePage = Math.max(1, Math.floor(page) || 1);
  const from = (safePage - 1) * COMMENTS_PER_PAGE;

  // Both queries carry the same predicate. A count that joined or filtered
  // differently from the list would report pages that do not exist.
  const [rows, counted] = await Promise.all([
    db
      .select({
        id: postComments.id,
        author_name: postComments.author_name,
        body: postComments.body,
        created_at: postComments.created_at,
      })
      .from(postComments)
      .where(and(eq(postComments.post_id, postId), publishedCommentsWhere()))
      .orderBy(...commentOrder)
      .limit(COMMENTS_PER_PAGE)
      .offset(from),
    db
      .select({ value: count() })
      .from(postComments)
      .where(and(eq(postComments.post_id, postId), publishedCommentsWhere())),
  ]);

  const total = counted[0]?.value ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / COMMENTS_PER_PAGE));

  // A page number past the end — a stale link, a hand-edited URL, or a comment
  // hidden between two page views — must land on the last real page instead of an
  // empty one, or the reader gets a pager sitting on a page that shows nothing.
  // The count and the list are fetched in parallel, so this correction cannot
  // happen up front; paying a second round trip only when the first came back
  // short keeps the ordinary path at two queries. The recursion bottoms out at
  // page 1, where `safePage > pageCount` can no longer hold.
  if (rows.length === 0 && safePage > pageCount) {
    return fetchPostComments(db, postId, pageCount);
  }

  return {
    comments: rows,
    total,
    page: safePage,
    pageCount,
  };
}

/**
 * Windowed page numbers, keeping the first, last and pages either side of the
 * current one and collapsing the rest into gaps. Copied in shape from the
 * catalogue pagination in app/products/page.tsx.
 */
export function commentPageWindow(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 1) return [1];
  const pages = new Set<number>([1, pageCount, page, page - 1, page + 1]);
  const kept = [...pages].filter((n) => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  let previous = 0;
  for (const n of kept) {
    if (previous && n - previous > 1) out.push("gap");
    out.push(n);
    previous = n;
  }
  return out;
}
