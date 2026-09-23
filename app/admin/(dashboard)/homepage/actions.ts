"use server";

import { revalidatePath } from "next/cache";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { homepageFeaturedProducts, products } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function addFeaturedProductAction(productId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = await requireRole("homepage");
    const found = await db
      .select({ id: products.id, status: products.status, name: products.name })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    const product = found[0];
    if (!product) return { ok: false, error: "Product not found." };
    if (product.status !== "published") return { ok: false, error: "Only published products can be featured." };

    const existing = await db
      .select({ id: homepageFeaturedProducts.id })
      .from(homepageFeaturedProducts)
      .where(eq(homepageFeaturedProducts.product_id, productId))
      .limit(1);
    if (!existing.length) {
      const maxRows = await db
        .select({ display_order: homepageFeaturedProducts.display_order })
        .from(homepageFeaturedProducts)
        .orderBy(desc(homepageFeaturedProducts.display_order))
        .limit(1);
      const display_order = (maxRows[0]?.display_order ?? 0) + 1;
      await db.insert(homepageFeaturedProducts).values({ product_id: productId, display_order });
    }
    await db.update(products).set({ featured: true }).where(eq(products.id, productId));
    await logAudit(auth.user, "add_featured", "product", productId);
    revalidatePath("/admin/homepage");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Update failed." };
  }
}

export async function removeFeaturedProductAction(productId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = await requireRole("homepage");
    await db.delete(homepageFeaturedProducts).where(eq(homepageFeaturedProducts.product_id, productId));
    await db.update(products).set({ featured: false }).where(eq(products.id, productId));
    await logAudit(auth.user, "remove_featured", "product", productId);
    revalidatePath("/admin/homepage");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Update failed." };
  }
}

export async function moveFeaturedProductAction(productId: string, direction: "up" | "down"): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = await requireRole("homepage");
    const list = await db
      .select({ product_id: homepageFeaturedProducts.product_id, display_order: homepageFeaturedProducts.display_order })
      .from(homepageFeaturedProducts)
      .orderBy(asc(homepageFeaturedProducts.display_order));
    const index = list.findIndex((r) => r.product_id === productId);
    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (index < 0 || swapWith < 0 || swapWith >= list.length) return { ok: false, error: "Nothing to move." };
    const a = list[index];
    const b = list[swapWith];
    await db
      .update(homepageFeaturedProducts)
      .set({ display_order: b.display_order })
      .where(eq(homepageFeaturedProducts.product_id, a.product_id));
    await db
      .update(homepageFeaturedProducts)
      .set({ display_order: a.display_order })
      .where(eq(homepageFeaturedProducts.product_id, b.product_id));
    await logAudit(auth.user, direction === "up" ? "move_up" : "move_down", "product", productId);
    revalidatePath("/admin/homepage");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Reorder failed." };
  }
}
