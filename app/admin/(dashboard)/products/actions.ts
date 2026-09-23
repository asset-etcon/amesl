"use server";

import { revalidatePath } from "next/cache";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/lib/db";
import { homepageFeaturedProducts, productDocuments, productImages, productSpecifications, products } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { productSchema, idsSchema } from "@/lib/validators";
import { slugify } from "@/lib/utils";

export interface ImageInput {
  id?: string;
  url: string;
  alt?: string;
  is_primary?: boolean;
  display_order?: number;
}

export interface SpecInput {
  id?: string;
  name: string;
  value: string;
  display_order?: number;
}

export interface DocInput {
  id?: string;
  name: string;
  url: string;
  file_type?: string;
  display_order?: number;
}

export interface ProductPayload {
  id?: string;
  product: {
    name: string;
    slug?: string;
    brand_id: string;
    category_id?: string | null;
    short_description?: string;
    description?: string;
    status: "draft" | "published" | "archived";
    featured?: boolean;
    seo_title?: string;
    seo_description?: string;
  };
  images: ImageInput[];
  specs: SpecInput[];
  docs: DocInput[];
}

export type ActionResult = { ok: boolean; error?: string; id?: string };

async function uniqueSlug(value: string, currentId?: string): Promise<string> {
  const base = slugify(value);
  let candidate = base;
  let i = 2;
  for (;;) {
    const conditions = [eq(products.slug, candidate)];
    if (currentId) conditions.push(ne(products.id, currentId));
    const rows = await db
      .select({ id: products.id })
      .from(products)
      .where(and(...conditions))
      .limit(1);
    if (!rows.length) return candidate;
    candidate = `${base}-${i++}`;
  }
}

async function syncChildren(productId: string, images: ImageInput[], specs: SpecInput[], docs: DocInput[]) {
  const imageUpdates = images.filter((x) => x.id).map((x, i) => ({
    id: x.id as string,
    url: x.url,
    alt: x.alt ?? "",
    is_primary: x.is_primary ?? i === 0,
    display_order: x.display_order ?? i,
  }));
  const imageInserts = images.filter((x) => !x.id).map((x, i) => ({
    product_id: productId,
    url: x.url,
    alt: x.alt ?? "",
    is_primary: x.is_primary ?? i === 0,
    display_order: x.display_order ?? i,
  }));

  const specUpdates = specs.filter((x) => x.id).map((x, i) => ({
    id: x.id as string,
    name: x.name,
    value: x.value,
    display_order: x.display_order ?? i,
  }));
  const specInserts = specs.filter((x) => !x.id).map((x, i) => ({
    product_id: productId,
    name: x.name,
    value: x.value,
    display_order: x.display_order ?? i,
  }));

  const docUpdates = docs.filter((x) => x.id).map((x, i) => ({
    id: x.id as string,
    name: x.name,
    url: x.url,
    file_type: x.file_type ?? "pdf",
    display_order: x.display_order ?? i,
  }));
  const docInserts = docs.filter((x) => !x.id).map((x, i) => ({
    product_id: productId,
    name: x.name,
    url: x.url,
    file_type: x.file_type ?? "pdf",
    display_order: x.display_order ?? i,
  }));

  for (const row of imageUpdates) {
    await db
      .update(productImages)
      .set({ url: row.url, alt: row.alt, is_primary: row.is_primary, display_order: row.display_order })
      .where(eq(productImages.id, row.id));
  }
  if (imageInserts.length) await db.insert(productImages).values(imageInserts);

  for (const row of specUpdates) {
    await db
      .update(productSpecifications)
      .set({ name: row.name, value: row.value, display_order: row.display_order })
      .where(eq(productSpecifications.id, row.id));
  }
  if (specInserts.length) await db.insert(productSpecifications).values(specInserts);

  for (const row of docUpdates) {
    await db
      .update(productDocuments)
      .set({ name: row.name, url: row.url, file_type: row.file_type, display_order: row.display_order })
      .where(eq(productDocuments.id, row.id));
  }
  if (docInserts.length) await db.insert(productDocuments).values(docInserts);

  const existingImages = await db.select({ id: productImages.id }).from(productImages).where(eq(productImages.product_id, productId));
  const keptImageIds = new Set(imageUpdates.map((x) => x.id));
  const removedImages = existingImages.map((r) => r.id).filter((id) => !keptImageIds.has(id));
  if (removedImages.length) await db.delete(productImages).where(inArray(productImages.id, removedImages));

  const existingSpecs = await db.select({ id: productSpecifications.id }).from(productSpecifications).where(eq(productSpecifications.product_id, productId));
  const keptSpecIds = new Set(specUpdates.map((x) => x.id));
  const removedSpecs = existingSpecs.map((r) => r.id).filter((id) => !keptSpecIds.has(id));
  if (removedSpecs.length) await db.delete(productSpecifications).where(inArray(productSpecifications.id, removedSpecs));

  const existingDocs = await db.select({ id: productDocuments.id }).from(productDocuments).where(eq(productDocuments.product_id, productId));
  const keptDocIds = new Set(docUpdates.map((x) => x.id));
  const removedDocs = existingDocs.map((r) => r.id).filter((id) => !keptDocIds.has(id));
  if (removedDocs.length) await db.delete(productDocuments).where(inArray(productDocuments.id, removedDocs));
}

export async function saveProductAction(payload: ProductPayload): Promise<ActionResult> {
  try {
    const auth = await requireRole("products_manage");
    const parsed = productSchema.safeParse(payload.product);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { ok: false, error: first ? `${first.path.join(".")}: ${first.message}` : "Invalid product data." };
    }

    const input = parsed.data;
    const slug = await uniqueSlug(input.slug?.trim() || input.name, payload.id);

    let productId = payload.id;

    if (payload.id) {
      await db
        .update(products)
        .set({
          name: input.name,
          slug,
          brand_id: input.brand_id,
          category_id: input.category_id || null,
          short_description: input.short_description ?? "",
          description: input.description ?? "",
          status: input.status,
          featured: input.featured ?? false,
          seo_title: input.seo_title ?? "",
          seo_description: input.seo_description ?? "",
          updated_by: auth.user.id,
        })
        .where(eq(products.id, payload.id));
    } else {
      const [created] = await db
        .insert(products)
        .values({
          name: input.name,
          slug,
          brand_id: input.brand_id,
          category_id: input.category_id || null,
          short_description: input.short_description ?? "",
          description: input.description ?? "",
          status: input.status,
          featured: input.featured ?? false,
          seo_title: input.seo_title ?? "",
          seo_description: input.seo_description ?? "",
          created_by: auth.user.id,
          updated_by: auth.user.id,
        })
        .returning({ id: products.id });
      if (!created) throw new Error("Insert failed.");
      productId = created.id;
    }

    await syncChildren(productId!, payload.images ?? [], payload.specs ?? [], payload.docs ?? []);

    await logAudit(auth.user, payload.id ? "update" : "create", "product", productId, { name: input.name, status: input.status });

    revalidatePath("/admin/products");
    revalidatePath("/admin");
    if (input.status === "published") {
      revalidatePath("/", "layout");
      revalidatePath("/products", "layout");
    }

    return { ok: true, id: productId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Something went wrong." };
  }
}

export async function deleteProductsAction(ids: string[]): Promise<ActionResult> {
  try {
    const auth = await requireRole("products_manage");
    const parsed = idsSchema.safeParse({ ids });
    if (!parsed.success) return { ok: false, error: "Select at least one product." };
    await db.delete(products).where(inArray(products.id, parsed.data.ids));
    await logAudit(auth.user, "delete", "product", `[${parsed.data.ids.join(",")}]`);
    revalidatePath("/admin/products");
    revalidatePath("/", "layout");
    revalidatePath("/products", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Delete failed." };
  }
}

export async function setProductStatusAction(ids: string[], status: "draft" | "published" | "archived"): Promise<ActionResult> {
  try {
    const auth = await requireRole("products_manage");
    const parsed = idsSchema.safeParse({ ids });
    if (!parsed.success) return { ok: false, error: "Select at least one product." };
    await db.update(products).set({ status, updated_by: auth.user.id }).where(inArray(products.id, parsed.data.ids));
    await logAudit(auth.user, `set_status_${status}`, "product", `[${parsed.data.ids.join(",")}]`);
    revalidatePath("/admin/products");
    revalidatePath("/admin");
    revalidatePath("/", "layout");
    revalidatePath("/products", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Update failed." };
  }
}

export async function setProductFeaturedAction(ids: string[], featured: boolean): Promise<ActionResult> {
  try {
    const auth = await requireRole("products_manage");
    const parsed = idsSchema.safeParse({ ids });
    if (!parsed.success) return { ok: false, error: "Select at least one product." };
    await db.update(products).set({ featured, updated_by: auth.user.id }).where(inArray(products.id, parsed.data.ids));

    for (const id of parsed.data.ids) {
      if (featured) {
        const [maxRow] = await db
          .select({ display_order: homepageFeaturedProducts.display_order })
          .from(homepageFeaturedProducts)
          .orderBy(desc(homepageFeaturedProducts.display_order))
          .limit(1);
        await db
          .insert(homepageFeaturedProducts)
          .values({ product_id: id, display_order: (maxRow?.display_order ?? 0) + 1 })
          .onConflictDoNothing();
      } else {
        await db.delete(homepageFeaturedProducts).where(eq(homepageFeaturedProducts.product_id, id));
      }
    }

    await logAudit(auth.user, featured ? "set_featured" : "unset_featured", "product", `[${parsed.data.ids.join(",")}]`);
    revalidatePath("/admin/products");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Update failed." };
  }
}

export async function duplicateProductAction(id: string): Promise<ActionResult> {
  try {
    const auth = await requireRole("products_manage");
    const product = await db.query.products.findFirst({ where: eq(products.id, id) });
    if (!product) throw new Error("Product not found.");
    const slug = await uniqueSlug(`${product.name} copy`);
    const [created] = await db
      .insert(products)
      .values({
        name: `${product.name} (copy)`,
        slug,
        brand_id: product.brand_id,
        category_id: product.category_id,
        short_description: product.short_description,
        description: product.description,
        status: "draft",
        featured: false,
        seo_title: product.seo_title,
        seo_description: product.seo_description,
        created_by: auth.user.id,
        updated_by: auth.user.id,
      })
      .returning({ id: products.id });
    if (!created) throw new Error("Insert failed.");

    const [images, specs, docs] = await Promise.all([
      db.select().from(productImages).where(eq(productImages.product_id, id)).orderBy(asc(productImages.display_order)),
      db.select().from(productSpecifications).where(eq(productSpecifications.product_id, id)).orderBy(asc(productSpecifications.display_order)),
      db.select().from(productDocuments).where(eq(productDocuments.product_id, id)).orderBy(asc(productDocuments.display_order)),
    ]);
    await syncChildren(
      created.id,
      images.map((r) => ({ url: r.url })),
      specs.map((r) => ({ name: r.name, value: r.value })),
      docs.map((r) => ({ name: r.name, url: r.url }))
    );

    await logAudit(auth.user, "duplicate", "product", created.id, { from: id });
    revalidatePath("/admin/products");
    return { ok: true, id: created.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Duplicate failed." };
  }
}