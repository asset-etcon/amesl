import Link from "next/link";
import { Plus } from "lucide-react";
import { asc, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsCategories, newsPosts } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { NewsCategoryTable, type NewsCategoryTableRow } from "@/components/admin/news-category-table";

export const metadata = { title: "News categories | AMESL Admin" };

export default async function NewsCategoriesPage() {
  const { profile } = await requireRole("news");
  const canManage = can(profile.role, "news_manage");

  const rows = await db
    .select({
      id: newsCategories.id,
      name: newsCategories.name,
      slug: newsCategories.slug,
      status: newsCategories.status,
      display_order: newsCategories.display_order,
      postCount: count(newsPosts.id),
    })
    .from(newsCategories)
    .leftJoin(newsPosts, eq(newsPosts.category_id, newsCategories.id))
    .groupBy(newsCategories.id)
    .orderBy(asc(newsCategories.display_order), asc(newsCategories.name));

  const tableRows: NewsCategoryTableRow[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status as "active" | "inactive",
    display_order: row.display_order,
    postCount: row.postCount,
  }));

  return (
    <div>
      <PageHeader
        title="News categories"
        description={`${tableRows.length} ${tableRows.length === 1 ? "category" : "categories"} used to group news articles.`}
        actions={
          canManage ? (
            <Link
              href="/admin/news-categories/new"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#e7a42b] px-4 text-[13.5px] font-bold text-[#172633] hover:bg-[#f3bb4e]"
            >
              <Plus size={16} /> New category
            </Link>
          ) : undefined
        }
      />
      <NewsCategoryTable rows={tableRows} />
    </div>
  );
}
