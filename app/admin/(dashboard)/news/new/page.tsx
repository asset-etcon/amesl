import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsCategories } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { NewsForm } from "@/components/admin/news-form";

export const metadata = { title: "New article | AMESL Admin" };

export default async function NewNewsPostPage() {
  await requireRole("news_manage");

  const categories = await db
    .select({ id: newsCategories.id, name: newsCategories.name })
    .from(newsCategories)
    .where(eq(newsCategories.status, "active"))
    .orderBy(asc(newsCategories.display_order), asc(newsCategories.name));

  return (
    <div>
      <PageHeader title="New article" description="Write and publish an article to the public news section." />
      <NewsForm categories={categories} />
    </div>
  );
}
