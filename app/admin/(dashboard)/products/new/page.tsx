import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { brands, categories } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/product-form";

export const metadata = { title: "New product | AMESL Admin" };

export default async function NewProductPage() {
  await requireRole("products_manage");

  const [brandRows, categoryRows] = await Promise.all([
    db.select({ id: brands.id, name: brands.name }).from(brands).orderBy(asc(brands.name)),
    db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.name)),
  ]);

  return (
    <div>
      <PageHeader title="New product" description="Add a product to the catalogue. Drafts stay invisible to the public site until published." />
      <ProductForm
        brands={brandRows.map((b) => ({ id: b.id, name: b.name }))}
        categories={categoryRows.map((c) => ({ id: c.id, name: c.name }))}
      />
    </div>
  );
}