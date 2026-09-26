import Link from "next/link";
import { Plus } from "lucide-react";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsPosts, newsCategories } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { NewsTable, type NewsTableRow } from "@/components/admin/news-table";
import { isNewsVisible } from "@/lib/news";
import type { NewsStatus } from "@/lib/types";

export const metadata = { title: "News | AMESL Admin" };

export default async function AdminNewsPage() {
  const { profile } = await requireRole("news");
  const canManage = can(profile.role, "news_manage");

  // One `now` for the whole page so "visible" matches the public site exactly.
  const now = new Date();

  const rows = await db
    .select({
      id: newsPosts.id,
      title: newsPosts.title,
      slug: newsPosts.slug,
      status: newsPosts.status,
      featured: newsPosts.featured,
      publish_at: newsPosts.publish_at,
      updated_at: newsPosts.updated_at,
      category_name: newsCategories.name,
    })
    .from(newsPosts)
    .leftJoin(newsCategories, eq(newsPosts.category_id, newsCategories.id))
    .orderBy(desc(newsPosts.updated_at));

  const tableRows: NewsTableRow[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status as NewsStatus,
    featured: row.featured,
    publishAt: row.publish_at,
    isPublic: isNewsVisible({ status: row.status, publish_at: row.publish_at }, now),
    categoryName: row.category_name,
    updatedAt: row.updated_at,
  }));

  const published = tableRows.filter((r) => r.isPublic).length;
  const drafts = tableRows.filter((r) => r.status === "draft").length;
  const scheduled = tableRows.filter((r) => r.status === "published" && r.publishAt && !r.isPublic).length;

  const summary = [
    `${tableRows.length} ${tableRows.length === 1 ? "article" : "articles"}`,
    `${published} live`,
    scheduled ? `${scheduled} scheduled` : null,
    drafts ? `${drafts} ${drafts === 1 ? "draft" : "drafts"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <PageHeader
        title="News"
        description={summary}
        actions={
          canManage ? (
            <Link
              href="/admin/news/new"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#e7a42b] px-4 text-[13.5px] font-bold text-[#172633] hover:bg-[#f3bb4e]"
            >
              <Plus size={16} /> New article
            </Link>
          ) : undefined
        }
      />
      <NewsTable rows={tableRows} canManage={canManage} />
    </div>
  );
}
