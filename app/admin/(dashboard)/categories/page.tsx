import Link from "next/link";
import { Plus } from "lucide-react";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { categories } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { CategoryTable, type CategoryRow } from "@/components/admin/category-table";

export const metadata = { title: "Categories | AMESL Admin" };

export default async function CategoriesPage() {
  const { profile } = await requireRole("categories");
  const canManage = can(profile.role, "categories");

  const categoryRows = await db.select().from(categories).orderBy(asc(categories.display_order));

  const rows: CategoryRow[] = categoryRows.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    status: c.status as "active" | "inactive",
    display_order: c.display_order,
  }));

  return (
    <div>
      <PageHeader
        title="Categories"
        description={`${rows.length} product categories.`}
        actions={
          canManage ? (
            <Link href="/admin/categories/new" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#e7a42b] px-4 text-[13.5px] font-bold text-[#172633] hover:bg-[#f3bb4e]">
              <Plus size={16} /> New category
            </Link>
          ) : undefined
        }
      />
      <CategoryTable rows={rows} />
    </div>
  );
}
