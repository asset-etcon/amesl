"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { productLabels } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { labelSchema, idsSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";

export interface LabelPayload {
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
    const conditions = [eq(productLabels.slug, candidate)];
    if (currentId) conditions.push(ne(productLabels.id, currentId));
    const rows = await db
      .select({ id: productLabels.id })
      .from(productLabels)
      .where(and(...conditions))
      .limit(1);
    if (!rows.length) return candidate;
    candidate = `${base}-${i++}`;
  }
}

export async function saveLabelAction(payload: LabelPayload) {
  try {
    const auth = await requireRole("labels");
    const parsed = labelSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { ok: false, error: first ? first.message : "Invalid label data." };
    }
    const input = parsed.data;
    const slug = await uniqueSlug(input.slug?.trim() || input.name, payload.id);

    if (payload.id) {
      await db
        .update(productLabels)
        .set({ name: input.name, slug, description: input.description ?? "", status: input.status, display_order: input.display_order })
        .where(eq(productLabels.id, payload.id));
    } else {
      const [created] = await db
        .insert(productLabels)
        .values({ name: input.name, slug, description: input.description ?? "", status: input.status, display_order: input.display_order })
        .returning({ id: productLabels.id });
      if (!created) throw new Error("Insert failed.");
      payload.id = created.id;
    }

    await logAudit(auth.user, payload.id ? "update" : "create", "label", payload.id, { name: input.name });
    revalidatePath("/admin/labels");
    revalidatePath("/products", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function deleteLabelAction(ids: string[]) {
  try {
    const auth = await requireRole("labels");
    const parsed = idsSchema.safeParse({ ids });
    if (!parsed.success) return { ok: false, error: "Select at least one label." };

    // product_label_assignments cascades on delete, so labels come off the
    // products that carried them without a second statement here.
    await db.delete(productLabels).where(inArray(productLabels.id, parsed.data.ids));
    await logAudit(auth.user, "delete", "label", `[${parsed.data.ids.join(",")}]`);
    revalidatePath("/admin/labels");
    revalidatePath("/products", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function setLabelStatusAction(ids: string[], status: "active" | "inactive") {
  try {
    const auth = await requireRole("labels");
    const parsed = idsSchema.safeParse({ ids });
    if (!parsed.success) return { ok: false, error: "Select at least one label." };
    await db.update(productLabels).set({ status }).where(inArray(productLabels.id, parsed.data.ids));
    await logAudit(auth.user, `set_status_${status}`, "label", `[${parsed.data.ids.join(",")}]`);
    revalidatePath("/admin/labels");
    revalidatePath("/products", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}
