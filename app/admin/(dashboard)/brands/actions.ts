"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { brands, products } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { brandSchema, idsSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";

export interface BrandPayload {
  id?: string;
  name: string;
  slug?: string;
  description?: string;
  website?: string;
  logo_url?: string;
  status: "active" | "inactive";
  display_order: number;
}

async function uniqueSlug(value: string, currentId?: string): Promise<string> {
  const base = slugify(value);
  let candidate = base;
  let i = 2;
  for (;;) {
    const conditions = [eq(brands.slug, candidate)];
    if (currentId) conditions.push(ne(brands.id, currentId));
    const rows = await db
      .select({ id: brands.id })
      .from(brands)
      .where(and(...conditions))
      .limit(1);
    if (!rows.length) return candidate;
    candidate = `${base}-${i++}`;
  }
}

export async function saveBrandAction(payload: BrandPayload) {
  try {
    const auth = await requireRole("brands");
    const parsed = brandSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { ok: false, error: first ? first.message : "Invalid brand data." };
    }
    const input = parsed.data;
    const slug = await uniqueSlug(input.slug?.trim() || input.name, payload.id);

    if (payload.id) {
      await db
        .update(brands)
        .set({
          name: input.name,
          slug,
          description: input.description ?? "",
          website: input.website ?? "",
          logo_url: input.logo_url ?? "",
          status: input.status,
          display_order: input.display_order,
        })
        .where(eq(brands.id, payload.id));
    } else {
      const [created] = await db
        .insert(brands)
        .values({
          name: input.name,
          slug,
          description: input.description ?? "",
          website: input.website ?? "",
          logo_url: input.logo_url ?? "",
          status: input.status,
          display_order: input.display_order,
        })
        .returning({ id: brands.id });
      if (!created) throw new Error("Insert failed.");
      payload.id = created.id;
    }

    await logAudit(auth.user, payload.id ? "update" : "create", "brand", payload.id, { name: input.name });
    revalidatePath("/admin/brands");
    revalidatePath("/", "layout");
    revalidatePath("/products", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function deleteBrandAction(ids: string[]) {
  try {
    const auth = await requireRole("brands");
    const parsed = idsSchema.safeParse({ ids });
    if (!parsed.success) return { ok: false, error: "Select at least one brand." };

    const rows = await db
      .select({ brand_id: products.brand_id })
      .from(products)
      .where(inArray(products.brand_id, parsed.data.ids));
    const used = new Set(rows.map((p) => p.brand_id));
    const blocked = parsed.data.ids.filter((id) => used.has(id));
    if (blocked.length) {
      return { ok: false, error: "Cannot delete brand(s) still used by products. Move or remove those products first." };
    }

    await db.delete(brands).where(inArray(brands.id, parsed.data.ids));
    await logAudit(auth.user, "delete", "brand", `[${parsed.data.ids.join(",")}]`);
    revalidatePath("/admin/brands");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Delete failed." };
  }
}

export async function setBrandStatusAction(ids: string[], status: "active" | "inactive") {
  try {
    const auth = await requireRole("brands");
    const parsed = idsSchema.safeParse({ ids });
    if (!parsed.success) return { ok: false, error: "Select at least one brand." };
    await db.update(brands).set({ status }).where(inArray(brands.id, parsed.data.ids));
    await logAudit(auth.user, `set_status_${status}`, "brand", `[${parsed.data.ids.join(",")}]`);
    revalidatePath("/admin/brands");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Update failed." };
  }
}
