"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { categorySchema, idsSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";

export interface CategoryPayload {
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  status: "active" | "inactive";
  display_order: number;
}

async function uniqueSlug(value: string, currentId?: string): Promise<string> {
  const base = slugify(value);
  let candidate = base;
  let i = 2;
  for (;;) {
    const conditions = [eq(categories.slug, candidate)];
    if (currentId) conditions.push(ne(categories.id, currentId));
    const rows = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(...conditions))
      .limit(1);
    if (!rows.length) return candidate;
    candidate = `${base}-${i++}`;
  }
}

export async function saveCategoryAction(payload: CategoryPayload) {
  try {
    const auth = await requireRole("categories");
    const parsed = categorySchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { ok: false, error: first ? first.message : "Invalid category data." };
    }
    const input = parsed.data;
    const slug = await uniqueSlug(input.slug?.trim() || input.name, payload.id);

    if (payload.id) {
      await db
        .update(categories)
        .set({ name: input.name, slug, description: input.description ?? "", status: input.status, display_order: input.display_order })
        .where(eq(categories.id, payload.id));
    } else {
      const [created] = await db
        .insert(categories)
        .values({ name: input.name, slug, description: input.description ?? "", status: input.status, display_order: input.display_order })
        .returning({ id: categories.id });
      if (!created) throw new Error("Insert failed.");
      payload.id = created.id;
    }

    await logAudit(auth.user, payload.id ? "update" : "create", "category", payload.id, { name: input.name });
    revalidatePath("/admin/categories");
    revalidatePath("/products", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function deleteCategoryAction(ids: string[]) {
  try {
    const auth = await requireRole("categories");
    const parsed = idsSchema.safeParse({ ids });
    if (!parsed.success) return { ok: false, error: "Select at least one category." };

    await db.delete(categories).where(inArray(categories.id, parsed.data.ids));
    await logAudit(auth.user, "delete", "category", `[${parsed.data.ids.join(",")}]`);
    revalidatePath("/admin/categories");
    revalidatePath("/products", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Delete failed." };
  }
}

export async function setCategoryStatusAction(ids: string[], status: "active" | "inactive") {
  try {
    const auth = await requireRole("categories");
    const parsed = idsSchema.safeParse({ ids });
    if (!parsed.success) return { ok: false, error: "Select at least one category." };
    await db.update(categories).set({ status }).where(inArray(categories.id, parsed.data.ids));
    await logAudit(auth.user, `set_status_${status}`, "category", `[${parsed.data.ids.join(",")}]`);
    revalidatePath("/admin/categories");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Update failed." };
  }
}
