"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { newsPosts, postComments } from "@/db/schema";
import { publishedNewsWhere } from "@/lib/news";
import { sanitizePlainText } from "@/lib/sanitize";
import { clientFingerprint, consume } from "@/lib/rate-limit";
import {
  COMMENT_BODY_MAX,
  COMMENT_NAME_MAX,
  COMMENT_MAX_PER_DAY,
  COMMENT_MAX_PER_HOUR,
  COMMENT_MAX_PER_MINUTE,
  QUOTE_MAX_FILL_MS,
  QUOTE_MIN_FILL_MS,
  commentSchema,
} from "@/lib/validators";
import { notifyNewComment } from "@/lib/mail/notify";
import type { CommentEmailData } from "@/lib/mail/templates";

export interface CommentSubmitInput {
  post_id: string;
  author_name: string;
  author_email: string;
  body: string;
  website?: string;
  started_at?: number;
}

/**
 * One message for every rejection a rate limiter or bot can provoke, so a spammer
 * cannot use the response text to work out which check tripped. The closed-article
 * case is deliberately not one of them: that is a real answer, not a signal.
 */
const REJECTED = "We could not post your comment right now. Please try again in a little while.";

/**
 * Counts recent comments for this client, for the cross-instance rate limit.
 *
 * Returns null when the query cannot run — for instance before the migration has
 * been applied — so the caller falls back to the in-process limit rather than
 * refusing every comment. A missing rate limit is bad; rejecting all comments
 * because the table is not there yet is worse.
 */
async function recentComments(submitterHash: string): Promise<{ hour: number; day: number } | null> {
  try {
    const rows = await db
      .select({
        hour: sql<number>`count(*) filter (where ${postComments.created_at} >= now() - interval '1 hour')::int`,
        day: sql<number>`count(*)::int`,
      })
      .from(postComments)
      .where(
        and(
          eq(postComments.submitter_hash, submitterHash),
          gte(postComments.created_at, sql`now() - interval '24 hours'`),
        ),
      );
    const row = rows[0];
    return row ? { hour: row.hour, day: row.day } : null;
  } catch {
    return null;
  }
}

export async function submitCommentAction(
  input: CommentSubmitInput,
): Promise<{ ok: boolean; error?: string; field?: string }> {
  const parsed = commentSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue ? issue.message : "Please complete the form.", field: issue?.path.join(".") };
  }
  const data = parsed.data;

  // Honeypot. A person never sees this field, so anything in it is a bot.
  // Report success so the bot learns nothing, and write nothing.
  if (data.website) {
    console.warn(`[comment] honeypot triggered (${data.website.length} chars) — discarded`);
    return { ok: true };
  }

  // Timing, using the same thresholds as the quote form.
  if (data.started_at !== undefined) {
    const elapsed = Date.now() - data.started_at;
    if (elapsed >= 0 && elapsed < QUOTE_MIN_FILL_MS) {
      console.warn(`[comment] rejected a submission completed in ${elapsed}ms — likely automated`);
      return { ok: false, error: REJECTED };
    }
    if (elapsed > QUOTE_MAX_FILL_MS) {
      console.warn(`[comment] rejected a submission with a stale form (${Math.round(elapsed / 1000)}s old)`);
      return { ok: false, error: REJECTED };
    }
  }

  // The post gate. This is the check that matters: the form is hidden by
  // `allow_comments`, but a hidden form is not a closed article. Without this a
  // crafted POST would write comments onto articles an editor had closed, and
  // onto drafts and archived posts, whose public pages 404.
  const post = await db
    .select({ id: newsPosts.id, slug: newsPosts.slug, title: newsPosts.title, allow_comments: newsPosts.allow_comments })
    .from(newsPosts)
    .where(and(eq(newsPosts.id, data.post_id), publishedNewsWhere()))
    .limit(1);
  const target = post[0];
  if (!target) {
    return { ok: false, error: "That article could not be found." };
  }
  if (!target.allow_comments) {
    return { ok: false, error: "Comments are closed on this article." };
  }

  const submitterHash = await clientFingerprint();

  const burst = consume(`comment:burst:${submitterHash}`, COMMENT_MAX_PER_MINUTE, 60_000);
  if (!burst.allowed) {
    console.warn(`[comment] rate limit hit (burst) for ${submitterHash.slice(0, 8)}…`);
    return { ok: false, error: REJECTED };
  }

  const recent = await recentComments(submitterHash);
  if (recent && (recent.hour >= COMMENT_MAX_PER_HOUR || recent.day >= COMMENT_MAX_PER_DAY)) {
    console.warn(`[comment] rate limit hit (${recent.hour}/hr, ${recent.day}/day) for ${submitterHash.slice(0, 8)}…`);
    return { ok: false, error: REJECTED };
  }

  // Plain text only. A comment is never rendered as HTML, so the stored value is
  // stripped of markup entirely and re-sanitised on read in the article page.
  // Re-applying the length caps after sanitising matters: the schema validated
  // the raw input, and the sanitiser can shorten a string but the row must still
  // satisfy the column's intent.
  const authorName = sanitizePlainText(data.author_name, COMMENT_NAME_MAX);
  const body = sanitizePlainText(data.body, COMMENT_BODY_MAX);
  if (authorName.length < 2 || body.length < 3) {
    return { ok: false, error: "Please write a little more than that." };
  }

  let stored: CommentEmailData;
  try {
    // Field by field, never spreading the payload, so a client cannot set `id`,
    // `status`, `post_id` or `created_at` to something it should not.
    const inserted = await db
      .insert(postComments)
      .values({
        post_id: target.id,
        author_name: authorName,
        author_email: data.author_email.trim().toLowerCase(),
        body,
        status: "published",
        submitter_hash: submitterHash,
      })
      .returning({
        id: postComments.id,
        author_name: postComments.author_name,
        author_email: postComments.author_email,
        body: postComments.body,
        created_at: postComments.created_at,
      });

    const row = inserted[0];
    if (!row) return { ok: false, error: "Could not post your comment. Please try again." };
    stored = row;
  } catch {
    return { ok: false, error: "Could not post your comment. Please try again." };
  }

  // The comment is live at this point. Revalidate so the reader sees it without
  // a manual refresh; the article page is not force-dynamic.
  revalidatePath(`/news/${target.slug}`);

  // Best-effort notification, after the durable write. The database is the system
  // of record: a mail outage must not be reported to the commenter as a failure.
  try {
    await notifyNewComment(stored, { title: target.title, slug: target.slug });
  } catch (err) {
    console.error(`[mail] comment ${stored.id} stored but notification threw unexpectedly`, err);
  }

  return { ok: true };
}
