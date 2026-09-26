"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, ne, or, isNull, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsCategories, newsPosts } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { actionErrorMessage, rethrowIfControlFlow } from "@/lib/action-guard";
import { logAudit } from "@/lib/audit";
import { idsSchema, newsCategorySchema, newsPostSchema } from "@/lib/validators";
import { sanitizePlainText, sanitizeRichText } from "@/lib/sanitize";
import { normaliseCoverImageUrl } from "@/lib/news";
import { slugify } from "@/lib/utils";

export interface NewsCategoryPayload {
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  status: "active" | "inactive";
  display_order: number;
}

/**
 * Produces a slug that is unique within its table. Loops with a numeric suffix
 * rather than failing, so an editor saving a second "Training" category is not
 * blocked by a constraint error they cannot act on.
 */
async function uniqueSlug(table: typeof newsPosts | typeof newsCategories, value: string, currentId?: string): Promise<string> {
  const base = slugify(value);
  let candidate = base;
  let i = 2;
  for (;;) {
    const conditions = [eq(table.slug, candidate)];
    if (currentId) conditions.push(ne(table.id, currentId));
    const rows = await db
      .select({ id: table.id })
      .from(table)
      .where(and(...conditions))
      .limit(1);
    if (!rows.length) return candidate;
    candidate = `${base}-${i++}`;
  }
}

export async function saveNewsCategoryAction(payload: NewsCategoryPayload) {
  const auth = await requireRole("news_manage");
  try {
    const parsed = newsCategorySchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { ok: false, error: first ? first.message : "Invalid category data." };
    }
    const input = parsed.data;
    const slug = await uniqueSlug(newsCategories, input.slug?.trim() || input.name, payload.id);

    // Built field by field from the validated input: the payload is never spread
    // into the row, so a client cannot set `id`, `created_by` or any audit column.
    const values = {
      name: sanitizePlainText(input.name, 120),
      slug,
      description: sanitizePlainText(input.description ?? "", 2000),
      status: input.status,
      display_order: input.display_order,
    };

    if (payload.id) {
      await db.update(newsCategories).set(values).where(eq(newsCategories.id, payload.id));
    } else {
      const [created] = await db.insert(newsCategories).values(values).returning({ id: newsCategories.id });
      if (!created) throw new Error("Insert failed.");
      payload.id = created.id;
    }

    await logAudit(auth.user, payload.id ? "update" : "create", "news_category", payload.id ?? "", { name: values.name, slug });
    revalidatePath("/admin/news-categories");
    revalidatePath("/news");
    revalidatePath("/sitemap.xml");
    return { ok: true, id: payload.id };
  } catch (err) {
    rethrowIfControlFlow(err);
    return { ok: false, error: actionErrorMessage(err, "Could not save the category.") };
  }
}

export async function deleteNewsCategoryAction(ids: string[]) {
  const auth = await requireRole("news_manage");
  try {
    const parsed = idsSchema.safeParse({ ids });
    if (!parsed.success) return { ok: false, error: "Select at least one category." };

    // Posts in a deleted category are not deleted: the FK is ON DELETE SET NULL,
    // so they survive as uncategorised and remain reachable by direct URL.
    await db.delete(newsCategories).where(inArray(newsCategories.id, parsed.data.ids));
    await logAudit(auth.user, "delete", "news_category", `[${parsed.data.ids.join(",")}]`);
    revalidatePath("/admin/news-categories");
    revalidatePath("/news");
    revalidatePath("/sitemap.xml");
    return { ok: true };
  } catch (err) {
    rethrowIfControlFlow(err);
    return { ok: false, error: actionErrorMessage(err, "Could not delete the category.") };
  }
}

export async function setNewsCategoryStatusAction(ids: string[], status: "active" | "inactive") {
  const auth = await requireRole("news_manage");
  try {
    const parsed = idsSchema.safeParse({ ids });
    if (!parsed.success) return { ok: false, error: "Select at least one category." };
    await db.update(newsCategories).set({ status }).where(inArray(newsCategories.id, parsed.data.ids));
    await logAudit(auth.user, `set_status_${status}`, "news_category", `[${parsed.data.ids.join(",")}]`);
    revalidatePath("/admin/news-categories");
    revalidatePath("/news");
    revalidatePath("/sitemap.xml");
    return { ok: true };
  } catch (err) {
    rethrowIfControlFlow(err);
    return { ok: false, error: actionErrorMessage(err, "Could not update the category.") };
  }
}

export interface NewsPostPayload {
  id?: string;
  title: string;
  slug?: string;
  excerpt?: string;
  body?: string;
  cover_image?: string;
  cover_image_alt?: string;
  category_id?: string | null;
  status: "draft" | "published" | "archived";
  featured?: boolean;
  publish_at?: string;
  seo_title?: string;
  seo_description?: string;
}

export async function saveNewsPostAction(payload: NewsPostPayload) {
  const auth = await requireRole("news_manage");
  try {
    const parsed = newsPostSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { ok: false, error: first ? first.message : "Invalid article data." };
    }
    const input = parsed.data;
    const slug = await uniqueSlug(newsPosts, input.slug?.trim() || input.title, payload.id);

    // A category id arriving from the client is untrusted: confirm it exists
    // rather than letting a bogus uuid become a broken link on a public page.
    // The slug is kept so the category page can be revalidated by its real URL.
    let categoryId: string | null = null;
    let categorySlug: string | null = null;
    if (input.category_id) {
      const category = await db
        .select({ id: newsCategories.id, slug: newsCategories.slug })
        .from(newsCategories)
        .where(eq(newsCategories.id, input.category_id))
        .limit(1);
      categoryId = category[0]?.id ?? null;
      categorySlug = category[0]?.slug ?? null;
    }

    // The editor runs in the browser, so this HTML is untrusted input. It is
    // sanitised against the allowlist here, at the only point it enters the
    // database.
    const body = sanitizeRichText(input.body ?? "");
    // Titles and excerpts are plain text by contract; strip any markup so they
    // cannot break out of a <title> tag or a meta description attribute.
    const title = sanitizePlainText(input.title, 200);
    const excerpt = sanitizePlainText(input.excerpt ?? "", 400);
    const seoTitle = sanitizePlainText(input.seo_title ?? "", 200);
    const seoDescription = sanitizePlainText(input.seo_description ?? "", 400);
    const coverImageAlt = sanitizePlainText(input.cover_image_alt ?? "", 200);
    // Only an http(s) URL or a site-relative path is accepted for the cover.
    const coverImage = normaliseCoverImageUrl(input.cover_image);

    const publishAt = input.publish_at ? new Date(input.publish_at).toISOString() : null;

    const values = {
      title,
      slug,
      excerpt,
      body,
      cover_image: coverImage,
      cover_image_alt: coverImageAlt,
      category_id: categoryId,
      status: input.status,
      featured: input.featured ?? false,
      publish_at: publishAt,
      seo_title: seoTitle,
      seo_description: seoDescription,
      updated_by: auth.user.id,
    };

    let id = payload.id;
    if (id) {
      await db.update(newsPosts).set(values).where(eq(newsPosts.id, id));
    } else {
      const [created] = await db
        .insert(newsPosts)
        // Only the server-derived author id is added on insert; nothing else from
        // the client payload reaches the row.
        .values({ ...values, created_by: auth.user.id })
        .returning({ id: newsPosts.id });
      if (!created) throw new Error("Insert failed.");
      id = created.id;
    }

    await logAudit(auth.user, payload.id ? "update" : "create", "news_post", id ?? "", {
      title,
      slug,
      status: input.status,
      featured: values.featured,
      publish_at: publishAt,
    });

    // Anything that can surface this post: the admin list, the public routes,
    // the homepage band and the sitemap.
    revalidatePath("/admin/news");
    revalidatePath("/news");
    revalidatePath(`/news/${slug}`);
    revalidatePath("/sitemap.xml");
    // Revalidate the real category page; a truncated path such as
    // "/news/category/" matches no route and silently does nothing.
    if (categorySlug) revalidatePath(`/news/category/${categorySlug}`);
    revalidatePath("/");
    return { ok: true, id };
  } catch (err) {
    rethrowIfControlFlow(err);
    return { ok: false, error: actionErrorMessage(err, "Could not save the article.") };
  }
}

export async function deleteNewsPostAction(ids: string[]) {
  const auth = await requireRole("news_manage");
  try {
    const parsed = idsSchema.safeParse({ ids });
    if (!parsed.success) return { ok: false, error: "Select at least one article." };
    await db.delete(newsPosts).where(inArray(newsPosts.id, parsed.data.ids));
    await logAudit(auth.user, "delete", "news_post", `[${parsed.data.ids.join(",")}]`);
    revalidatePath("/admin/news");
    revalidatePath("/news");
    revalidatePath("/sitemap.xml");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    rethrowIfControlFlow(err);
    return { ok: false, error: actionErrorMessage(err, "Could not delete the article.") };
  }
}

export async function setNewsPostStatusAction(ids: string[], status: "draft" | "published" | "archived") {
  const auth = await requireRole("news_manage");
  try {
    const parsed = idsSchema.safeParse({ ids });
    if (!parsed.success) return { ok: false, error: "Select at least one article." };
    await db
      .update(newsPosts)
      .set({ status, updated_by: auth.user.id })
      .where(inArray(newsPosts.id, parsed.data.ids));
    await logAudit(auth.user, `set_status_${status}`, "news_post", `[${parsed.data.ids.join(",")}]`);
    revalidatePath("/admin/news");
    revalidatePath("/news");
    revalidatePath("/sitemap.xml");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    rethrowIfControlFlow(err);
    return { ok: false, error: actionErrorMessage(err, "Could not update the article.") };
  }
}

export async function setNewsPostFeaturedAction(ids: string[], featured: boolean) {
  const auth = await requireRole("news_manage");
  try {
    const parsed = idsSchema.safeParse({ ids });
    if (!parsed.success) return { ok: false, error: "Select at least one article." };
    await db
      .update(newsPosts)
      .set({ featured, updated_by: auth.user.id })
      .where(inArray(newsPosts.id, parsed.data.ids));
    await logAudit(auth.user, featured ? "feature" : "unfeature", "news_post", `[${parsed.data.ids.join(",")}]`);
    revalidatePath("/admin/news");
    revalidatePath("/news");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    rethrowIfControlFlow(err);
    return { ok: false, error: actionErrorMessage(err, "Could not update the article.") };
  }
}
