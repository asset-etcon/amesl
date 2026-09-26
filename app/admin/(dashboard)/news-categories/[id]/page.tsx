import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsCategories } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { NewsCategoryForm } from "@/components/admin/news-category-form";

export const metadata = { title: "Edit news category | AMESL Admin" };

export default async function EditNewsCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("news_manage");
  const { id } = await params;

  const rows = await db.select().from(newsCategories).where(eq(newsCategories.id, id)).limit(1);
  const category = rows[0];
  if (!category) notFound();

  return (
    <div>
      <PageHeader title="Edit news category" description={`/news/category/${category.slug}`} />
      <NewsCategoryForm
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
