import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { brands, categories, productDocuments, productImages, productSpecifications, products, productLabels, productLabelAssignments } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm, type FormProduct } from "@/components/admin/product-form";

export const metadata = { title: "Edit product | AMESL Admin" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("products_manage");
  const { id } = await params;

  const [product, images, specs, docs, brandRows, categoryRows, labelRows, assigned] = await Promise.all([
    db.query.products.findFirst({ where: eq(products.id, id) }),
    db.query.productImages.findMany({ where: eq(productImages.product_id, id), orderBy: asc(productImages.display_order) }),
    db.query.productSpecifications.findMany({ where: eq(productSpecifications.product_id, id), orderBy: asc(productSpecifications.display_order) }),
    db.query.productDocuments.findMany({ where: eq(productDocuments.product_id, id), orderBy: asc(productDocuments.display_order) }),
    db.select({ id: brands.id, name: brands.name }).from(brands).orderBy(asc(brands.name)),
    db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.name)),
    // Active labels are the assignable set, ordered by display order.
    db
      .select({ id: productLabels.id, name: productLabels.name })
      .from(productLabels)
      .where(eq(productLabels.status, "active"))
      .orderBy(asc(productLabels.display_order), asc(productLabels.name)),
    db
      .select({ label_id: productLabelAssignments.label_id })
      .from(productLabelAssignments)
      .where(eq(productLabelAssignments.product_id, id))
      .orderBy(asc(productLabelAssignments.display_order)),
  ]);

  if (!product) notFound();

  const formProduct: FormProduct = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    brand_id: product.brand_id,
    category_id: product.category_id,
    short_description: product.short_description,
    description: product.description,
    status: product.status as FormProduct["status"],
    featured: product.featured,
    seo_title: product.seo_title,
    seo_description: product.seo_description,
    images: images.map((im) => ({ id: im.id, url: im.url, alt: im.alt, is_primary: im.is_primary })),
    specs: specs.map((s) => ({ id: s.id, name: s.name, value: s.value })),
    docs: docs.map((d) => ({ id: d.id, name: d.name, url: d.url, file_type: d.file_type })),
    // Intersected with the active set so a retired label cannot be silently
    // dropped from the form and reaped by the save. It stays on the public page
    // only as an assignment, which the detail query already filters out.
    label_ids: assigned.map((a) => a.label_id).filter((lid) => labelRows.some((l) => l.id === lid)),
  };

  return (
    <div>
      <PageHeader title="Edit product" description={product.name} />
      <ProductForm
        product={formProduct}
        brands={brandRows.map((b) => ({ id: b.id, name: b.name }))}
        categories={categoryRows.map((c) => ({ id: c.id, name: c.name }))}
        labels={labelRows}
      />
    </div>
  );
}