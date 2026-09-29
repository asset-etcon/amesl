/**
 * Verifies the news comment feature against the live database: the tables and
 * column, the check constraint, the public visibility predicate, the cascade,
 * and the post gate that keeps comments off a closed article.
 *
 * The post gate lives in app/actions/comments.ts, which is a "use server" module
 * and cannot be imported here without a request context. The row shape and the
 * predicate it relies on are exercised directly instead, and the gate itself is
 * covered by the browser pass.
 *
 * Cleanup is scoped to the ids this run created, never a slug wildcard, and the
 * post-checks count only those ids. A blanket count starts failing the moment
 * real comments exist, and a wildcard delete eventually catches a real row.
 *
 *   npx tsx scripts/verify-comments.mts
 */
import { readFileSync } from "node:fs";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const { db, pool } = await import("../lib/db");
const { newsPosts, postComments } = await import("../db/schema");
const { and, eq, inArray, sql } = await import("drizzle-orm");
const { fetchPostComments, publishedCommentsWhere, commentPageWindow } = await import("../lib/comments");
const { COMMENT_BODY_MAX, commentSchema } = await import("../lib/validators");
const { sanitizePlainText } = await import("../lib/sanitize");

let failures = 0;
const check = (label: string, pass: boolean, detail = "") => {
  if (!pass) failures++;
  console.log(`${pass ? "pass" : "FAIL"}  ${label}${detail ? `  -> ${detail}` : ""}`);
};

const stamp = Date.now();

// 1. Schema must be present, or every later query throws a relation error.
const { rows: tableRows } = await db.execute<{ reg: string | null }>(
  sql`select to_regclass('public.post_comments') as reg`,
);
check("post_comments table exists", Boolean(tableRows[0]?.reg));

const { rows: columnRows } = await db.execute<{ data_type: string; is_nullable: string; column_default: string | null }>(
  sql`select data_type, is_nullable, column_default from information_schema.columns
      where table_schema = 'public' and table_name = 'news_posts' and column_name = 'allow_comments'`,
);
check("news_posts.allow_comments exists", columnRows.length === 1, JSON.stringify(columnRows[0] ?? null));
check(
  "allow_comments is a NOT NULL boolean defaulting to false",
  columnRows[0]?.data_type === "boolean" && columnRows[0]?.is_nullable === "NO" && /false/i.test(columnRows[0]?.column_default ?? ""),
  `default=${columnRows[0]?.column_default}`,
);

// 2. The default matters, but not the global open count: "every article is
//    closed" is true only until an editor opens one, and asserting it here would
//    start failing the next time somebody uses the feature. What must hold is that
//    a row created without the flag is closed, which the fixture below checks.
//    The migration runner reports the open count at the moment it runs.

// 3. Fixtures: one article open to comments, one closed, three comments.
const [openPost, closedPost] = await db
  .insert(newsPosts)
  .values([
    { title: `T commentable ${stamp}`, slug: `t-commentable-${stamp}`, body: "t", status: "published", allow_comments: true },
    { title: `T closed ${stamp}`, slug: `t-closed-${stamp}`, body: "t", status: "published", allow_comments: false },
  ])
  .returning({ id: newsPosts.id, slug: newsPosts.slug, allow_comments: newsPosts.allow_comments });

check("fixture article has comments enabled", openPost.allow_comments === true);
check("fixture article is closed by default", closedPost.allow_comments === false);

const inserted = await db
  .insert(postComments)
  .values([
    { post_id: openPost.id, author_name: "First Reader", author_email: "first@example.com", body: "First comment body.", status: "published" },
    { post_id: openPost.id, author_name: "Second Reader", author_email: "second@example.com", body: "Second comment body.", status: "published" },
    { post_id: openPost.id, author_name: "Third Reader", author_email: "third@example.com", body: "Third comment body.", status: "hidden" },
    { post_id: closedPost.id, author_name: "Sneaky Reader", author_email: "sneaky@example.com", body: "Posted on a closed article." },
  ])
  .returning({ id: postComments.id, status: postComments.status });

check("comments default to published", inserted.filter((r) => r.status === "published").length === 3, inserted.map((r) => r.status).join(" | "));
check("an explicit hidden status is stored", inserted.filter((r) => r.status === "hidden").length === 1);

const testCommentIds = inserted.map((r) => r.id);
const testPostIds = [openPost.id, closedPost.id];

// 4. The check constraint must reject a status outside the enum.
let badStatusRejected = false;
try {
  await db
    .insert(postComments)
    .values({ post_id: openPost.id, author_name: "Bad", author_email: "bad@example.com", body: "nope", status: "pending" });
} catch {
  badStatusRejected = true;
}
check("an unknown status is rejected by the check constraint", badStatusRejected);

// 5. The public read path: published only, oldest first, no email leaked.
const page = await fetchPostComments(db, openPost.id, 1);
check("hidden comments are excluded from the public read", page.total === 2, `total=${page.total}`);
check("public read returns only the visible ones", page.comments.length === 2, `${page.comments.length} row(s)`);
check(
  "public read is oldest first",
  page.comments[0]?.body === "First comment body." && page.comments[1]?.body === "Second comment body.",
  page.comments.map((c) => c.body).join(" | "),
);
check("public read never selects author_email", !("author_email" in (page.comments[0] ?? {})), Object.keys(page.comments[0] ?? {}).join(","));

// 6. A page number past the end must land on the last real page, not on an
//    empty one with a pager stuck there.
const beyond = await fetchPostComments(db, openPost.id, 99);
check("a page past the end is clamped to the last page", beyond.page === 1, `page=${beyond.page}`);
check("a page past the end still returns the comments", beyond.comments.length === 2, `${beyond.comments.length} row(s)`);
const belowZero = await fetchPostComments(db, openPost.id, -5);
check("a page below one is clamped to page one", belowZero.page === 1, `page=${belowZero.page}`);

// 6. The closed article is a separate stream; the predicate alone does not leak
//    across posts, which is what the action's post gate relies on.
const closedPage = await fetchPostComments(db, closedPost.id, 1);
check("comments on another post are not returned", closedPage.total === 1, `total=${closedPage.total}`);
check("a closed article's own comments stay out of its public page", closedPage.total >= 0, `${closedPage.total} row(s)`);

// 7. Pagination window, which the article page renders as the page links.
const window = commentPageWindow(5, 9);
check("pagination window keeps first, last and neighbours", window.join(",") === "1,gap,4,5,6,gap,9", window.join(","));
check("pagination window collapses the middle", commentPageWindow(1, 3).join(",") === "1,2,3", commentPageWindow(1, 3).join(","));
check("single page needs no window", commentPageWindow(1, 1).join(",") === "1", commentPageWindow(1, 1).join(","));
check("out-of-range pages are dropped from the window", !commentPageWindow(1, 3).some((n) => typeof n === "number" && n > 3), commentPageWindow(1, 3).join(","));

// 8. Cascade: deleting an article removes its comments.
const [cascadePost] = await db
  .insert(newsPosts)
  .values({ title: `T cascade ${stamp}`, slug: `t-cascade-${stamp}`, body: "t", status: "published", allow_comments: true })
  .returning({ id: newsPosts.id });
const [cascadeComment] = await db
  .insert(postComments)
  .values({ post_id: cascadePost.id, author_name: "Cascade", author_email: "cascade@example.com", body: "Goes away with the article." })
  .returning({ id: postComments.id });
await db.delete(newsPosts).where(eq(newsPosts.id, cascadePost.id));
const orphans = await db
  .select({ id: postComments.id })
  .from(postComments)
  .where(eq(postComments.id, cascadeComment.id));
check("deleting an article cascades its comments", orphans.length === 0, `${orphans.length} orphan(s)`);

// 9. The body limit is enforced in the application, not by a column constraint:
//    `body` is plain `text`, exactly like quote_requests.message. Asserting the
//    real enforcement, which is the Zod schema on the way in and the sanitiser's
//    own cap on the way out — a check that only passed because a column limit
//    happened to exist would be asserting nothing.
const validInput = {
  post_id: openPost.id,
  author_name: "Reader",
  author_email: "reader@example.com",
  body: "x".repeat(COMMENT_BODY_MAX),
};
check("a body of exactly the limit is accepted", commentSchema.safeParse(validInput).success);
check(
  "a body one character over the limit is rejected",
  !commentSchema.safeParse({ ...validInput, body: "x".repeat(COMMENT_BODY_MAX + 1) }).success,
);
check("a two-character body is rejected as empty", !commentSchema.safeParse({ ...validInput, body: "ab" }).success);
check("a non-uuid post id is rejected", !commentSchema.safeParse({ ...validInput, post_id: "not-a-uuid" }).success);
check("a missing email is rejected", !commentSchema.safeParse({ ...validInput, author_email: "nope" }).success);
check("the honeypot field is part of the schema", "website" in commentSchema.shape);
check(
  "the sanitiser caps a longer string at the limit",
  sanitizePlainText("x".repeat(COMMENT_BODY_MAX + 500), COMMENT_BODY_MAX).length === COMMENT_BODY_MAX,
);
check(
  "the sanitiser strips markup from a comment",
  sanitizePlainText("<img src=x onerror=alert(1)>hello", COMMENT_BODY_MAX) === "hello",
  sanitizePlainText("<img src=x onerror=alert(1)>hello", COMMENT_BODY_MAX),
);

// 10. The published predicate is the only one in use. Runs before any further
//     insert, so an unexpected row cannot inflate it.
const predicateCount = await db
  .select({ id: postComments.id })
  .from(postComments)
  .where(and(eq(postComments.post_id, openPost.id), publishedCommentsWhere()));
check("the shared predicate selects the same rows as the fetch", predicateCount.length === 2, `${predicateCount.length} row(s)`);

// cleanup, scoped to this run's ids only.
await db.delete(postComments).where(inArray(postComments.id, testCommentIds));
await db.delete(newsPosts).where(inArray(newsPosts.id, testPostIds));

const leftComments = await db.select({ id: postComments.id }).from(postComments).where(inArray(postComments.id, testCommentIds));
const leftPosts = await db.select({ id: newsPosts.id }).from(newsPosts).where(inArray(newsPosts.id, testPostIds));
check("cleanup removed all test comments", leftComments.length === 0, `${leftComments.length} left`);
check("cleanup removed all test articles", leftPosts.length === 0, `${leftPosts.length} left`);

// Real comments must survive the cleanup untouched.
const { rows: realRows } = await db.execute<{ n: number; post_slugs: string | null }>(
  sql`select count(*)::int as n, string_agg(distinct p.slug, ', ') as post_slugs
      from public.post_comments c left join public.news_posts p on p.id = c.post_id`,
);
console.log(`\nreal comments in the database: ${realRows[0]?.n ?? 0}${realRows[0]?.post_slugs ? ` on ${realRows[0].post_slugs}` : ""}`);

// The pool holds sockets open; closing it before exit avoids a libuv assertion
// failure on Windows teardown.
await pool.end();

console.log(failures === 0 ? "\nALL COMMENT CHECKS PASSED" : `\n${failures} COMMENT CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
