import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { CategoryForm } from "@/components/admin/category-form";

export const metadata = { title: "Edit category | AMESL Admin" };

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("categories");
  const { id } = await params;
  const category = await db.query.categories.findFirst({ where: eq(categories.id, id) });
  if (!category) notFound();

  return (
    <div>
      <PageHeader title="Edit category" description={category.name} />
      <CategoryForm
        category={{
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          status: category.status as "active" | "inactive",
          display_order: category.display_order,
        }}
      />
    </div>
  );
}
