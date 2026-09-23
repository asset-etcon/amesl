import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { brands } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { BrandForm } from "@/components/admin/brand-form";

export const metadata = { title: "Edit brand | AMESL Admin" };

export default async function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("brands");
  const { id } = await params;
  const brand = await db.query.brands.findFirst({ where: eq(brands.id, id) });
  if (!brand) notFound();

  return (
    <div>
      <PageHeader title="Edit brand" description={brand.name} />
      <BrandForm
        brand={{
          id: brand.id,
          name: brand.name,
          slug: brand.slug,
          description: brand.description,
          website: brand.website,
          logo_url: brand.logo_url,
          status: brand.status as "active" | "inactive",
          display_order: brand.display_order,
        }}
      />
    </div>
  );
}
