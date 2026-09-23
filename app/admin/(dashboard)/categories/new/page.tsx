import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { CategoryForm } from "@/components/admin/category-form";

export const metadata = { title: "New category | AMESL Admin" };

export default async function NewCategoryPage() {
  await requireRole("categories");
  return (
    <div>
      <PageHeader title="New category" description="Organise products into clear groupings." />
      <CategoryForm />
    </div>
  );
}