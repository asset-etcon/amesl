import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { NewsCategoryForm } from "@/components/admin/news-category-form";

export const metadata = { title: "New news category | AMESL Admin" };

export default async function NewNewsCategoryPage() {
  await requireRole("news_manage");
  return (
    <div>
      <PageHeader title="New news category" description="Group related articles together on the public news pages." />
      <NewsCategoryForm />
    </div>
  );
}
