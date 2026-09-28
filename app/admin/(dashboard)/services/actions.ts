"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { services } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { actionErrorMessage, rethrowIfControlFlow } from "@/lib/action-guard";
import { logAudit } from "@/lib/audit";
import { idsSchema, serviceSchema } from "@/lib/validators";
import { sanitizePlainText, sanitizeRichText } from "@/lib/sanitize";
import { normaliseCoverImageUrl } from "@/lib/news";
import { slugify } from "@/lib/utils";

/**
 * Produces a slug that is unique within `services`, looping with a numeric suffix
 * rather than failing, so an editor saving a second "Vibration Analysis" is not
 * blocked by a constraint error they cannot act on.
 */
async function uniqueSlug(value: string, currentId?: string): Promise<string> {
  const base = slugify(value);
  let candidate = base;
  let i = 2;
  for (;;) {
    const conditions = [eq(services.slug, candidate)];
    if (currentId) conditions.push(ne(services.id, currentId));
    const rows = await db
      .select({ id: services.id })
      .from(services)
      .where(and(...conditions))
      .limit(1);
    if (!rows.length) return candidate;
    candidate = `${base}-${i++}`;
  }
}

export interface ServicePayload {
  id?: string;
  name: string;
  slug?: string;
  summary?: string;
  icon: string;
  overview?: string;
  scope?: string;
  method?: string;
  deliverables?: string;
  image?: string;
  image_alt?: string;
  status: "active" | "inactive";
  display_order?: number;
  seo_title?: string;
  seo_description?: string;
}

export async function saveServiceAction(payload: ServicePayload) {
  // Authorisation runs *outside* the try: `requireRole` redirects unauthenticated
  // callers by throwing, and a blanket catch would swallow that signal.
  const auth = await requireRole("services_manage");

  try {
    const parsed = serviceSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { ok: false, error: first ? first.message : "Invalid service data." };
    }
    const input = parsed.data;
    const slug = await uniqueSlug(input.slug?.trim() || input.name, payload.id);

    // The editor runs in the browser, so this HTML is untrusted input. It is
    // sanitised against the allowlist here, at the only point it enters the
    // database. Re-sanitised on read as defence in depth.
    const overview = sanitizeRichText(input.overview ?? "");
    const scope = sanitizeRichText(input.scope ?? "");
    const method = sanitizeRichText(input.method ?? "");
    const deliverables = sanitizeRichText(input.deliverables ?? "");

    // Titles, summaries and SEO fields are plain text by contract; strip any
    // markup so they cannot break out of a <title> tag or a meta description.
    const name = sanitizePlainText(input.name, 160);
    const summary = sanitizePlainText(input.summary ?? "", 300);
    const seoTitle = sanitizePlainText(input.seo_title ?? "", 200);
    const seoDescription = sanitizePlainText(input.seo_description ?? "", 400);
    const imageAlt = sanitizePlainText(input.image_alt ?? "", 200);
    // Only an http(s) URL or a site-relative path is accepted for the image.
    const image = normaliseCoverImageUrl(input.image);

    // Built field by field rather than spreading the payload, so `id`, `created_at`
    // and `created_by` are unreachable from the client.
    const values = {
      name,
      slug,
      summary,
      icon: input.icon,
      overview,
      scope,
      method,
      deliverables,
      image,
      image_alt: imageAlt,
      status: input.status,
      display_order: input.display_order,
      seo_title: seoTitle,
      seo_description: seoDescription,
      updated_by: auth.user.id,
    };

    let id = payload.id;
    // The slug this service was cached under before the edit. A rename leaves the
    // old URL live and reachable, so it has to be revalidated as well; otherwise
    // /services/<old-slug> keeps serving the render from before the change.
    let previousSlug: string | null = null;
    if (id) {
      const [existing] = await db
        .select({ slug: services.slug })
        .from(services)
        .where(eq(services.id, id))
        .limit(1);
      previousSlug = existing?.slug ?? null;
      await db.update(services).set(values).where(eq(services.id, id));
    } else {
      const [created] = await db
        .insert(services)
        .values({ ...values, created_by: auth.user.id })
        .returning({ id: services.id });
      if (!created) throw new Error("Insert failed.");
      id = created.id;
    }

    await logAudit(auth.user, payload.id ? "update" : "create", "service", id ?? "", {
      name, slug, status: values.status, display_order: values.display_order,
    });

    // Anything that can surface this service: the admin list, the public grid,
    // its detail page, the homepage band and the sitemap.
    revalidatePath("/admin/services");
    revalidatePath("/services");
    if (previousSlug && previousSlug !== slug) revalidatePath(`/services/${previousSlug}`);
    revalidatePath(`/services/${slug}`);
    revalidatePath("/sitemap.xml");
    revalidatePath("/");
    return { ok: true, id };
  } catch (err) {
    rethrowIfControlFlow(err);
    return { ok: false, error: actionErrorMessage(err, "Could not save the service.") };
  }
}

export async function deleteServiceAction(ids: string[]) {
  const auth = await requireRole("services_manage");

  try {
    const parsed = idsSchema.safeParse({ ids });
    if (!parsed.success) return { ok: false, error: "Select at least one service." };

    // Slugs are read before the delete so each orphaned detail path can be
    // revalidated. A new service later reusing one of these slugs would otherwise
    // inherit a cached render of the page that used to live at that URL.
    const rows = await db.select({ slug: services.slug }).from(services).where(inArray(services.id, parsed.data.ids));
    await db.delete(services).where(inArray(services.id, parsed.data.ids));

    await logAudit(auth.user, "delete", "service", `[${parsed.data.ids.join(",")}]`);
    revalidatePath("/admin/services");
    revalidatePath("/services");
    for (const row of rows) revalidatePath(`/services/${row.slug}`);
    revalidatePath("/sitemap.xml");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    rethrowIfControlFlow(err);
    return { ok: false, error: actionErrorMessage(err, "Could not delete the service.") };
  }
}

export async function setServiceStatusAction(ids: string[], status: "active" | "inactive") {
  const auth = await requireRole("services_manage");

  try {
    const parsed = idsSchema.safeParse({ ids });
    if (!parsed.success) return { ok: false, error: "Select at least one service." };

    // Slugs are read before the update for the same reason they are read before a
    // delete: deactivating a service must not leave its detail page served from
    // cache, and a later reactivation would inherit that stale render.
    const rows = await db.select({ slug: services.slug }).from(services).where(inArray(services.id, parsed.data.ids));
    await db.update(services).set({ status, updated_by: auth.user.id }).where(inArray(services.id, parsed.data.ids));

    await logAudit(auth.user, `set_status_${status}`, "service", `[${parsed.data.ids.join(",")}]`);
    revalidatePath("/admin/services");
    revalidatePath("/services");
    for (const row of rows) revalidatePath(`/services/${row.slug}`);
    revalidatePath("/sitemap.xml");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    rethrowIfControlFlow(err);
    return { ok: false, error: actionErrorMessage(err, "Could not update the service.") };
  }
}
