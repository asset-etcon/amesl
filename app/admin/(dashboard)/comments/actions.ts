"use server";

import { revalidatePath } from "next/cache";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsPosts, postComments } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { rethrowIfControlFlow, actionErrorMessage } from "@/lib/action-guard";
import { idsSchema } from "@/lib/validators";

const COMMENT_STATUSES = ["published", "hidden"] as const;
type CommentStatus = (typeof COMMENT_STATUSES)[number];

/**
 * Revalidates the article page for each affected post, on top of the admin list.
 *
 * The slugs are read BEFORE the mutation. After a delete the rows are gone, so
 * asking for them afterwards yields nothing and the public article pages are
 * left serving a cached thread — the comment would vanish from the admin queue
 * and stay on the page.
 */
async function revalidateArticles(postIds: string[]): Promise<void> {
  if (postIds.length === 0) return;
  const posts = await db
    .select({ slug: newsPosts.slug })
    .from(newsPosts)
    .where(inArray(newsPosts.id, postIds));
  for (const post of posts) revalidatePath(`/news/${post.slug}`);
}

export async function setCommentStatusAction(ids: string[], status: CommentStatus) {
  // Authorisation runs OUTSIDE the try: requireRole redirects unauthenticated
  // callers by throwing, and a blanket catch would swallow that signal.
  const auth = await requireRole("comments_manage");
  try {
    if (!COMMENT_STATUSES.includes(status)) return { ok: false, error: "Invalid status." };
    const parsed = idsSchema.safeParse({ ids });
    if (!parsed.success) return { ok: false, error: "Select at least one comment." };

    const postIds = await db
      .select({ post_id: postComments.post_id })
      .from(postComments)
      .where(inArray(postComments.id, parsed.data.ids));

    await db.update(postComments).set({ status }).where(inArray(postComments.id, parsed.data.ids));
    await logAudit(auth.user, status === "hidden" ? "hide" : "publish", "comment", parsed.data.ids.join(","), {
      count: parsed.data.ids.length,
    });
    revalidatePath("/admin/comments");
    await revalidateArticles([...new Set(postIds.map((r) => r.post_id))]);
    return { ok: true };
  } catch (err) {
    rethrowIfControlFlow(err);
    return { ok: false, error: actionErrorMessage(err, "Could not update the comment.") };
  }
}

export async function deleteCommentsAction(ids: string[]) {
  const auth = await requireRole("comments_manage");
  try {
    const parsed = idsSchema.safeParse({ ids });
    if (!parsed.success) return { ok: false, error: "Select at least one comment." };

    // Read the slugs first — see revalidateArticles.
    const postIds = await db
      .select({ post_id: postComments.post_id })
      .from(postComments)
      .where(inArray(postComments.id, parsed.data.ids));

    await db.delete(postComments).where(inArray(postComments.id, parsed.data.ids));
    await logAudit(auth.user, "delete", "comment", parsed.data.ids.join(","), { count: parsed.data.ids.length });
    revalidatePath("/admin/comments");
    await revalidateArticles([...new Set(postIds.map((r) => r.post_id))]);
    return { ok: true };
  } catch (err) {
    rethrowIfControlFlow(err);
    return { ok: false, error: actionErrorMessage(err, "Could not delete the comment.") };
  }
}
