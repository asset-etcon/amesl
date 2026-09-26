import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsCategories, newsPosts } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { NewsForm } from "@/components/admin/news-form";
import type { NewsStatus } from "@/lib/types";

export const metadata = { title: "Edit article | AMESL Admin" };

export default async function EditNewsPostPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("news_manage");
  const { id } = await params;

  // Drafts and archived posts are only reachable here, so this lookup must NOT
  // apply the public visibility predicate.
  const rows = await db.select().from(newsPosts).where(eq(newsPosts.id, id)).limit(1);
  const post = rows[0];
  if (!post) notFound();

  // Offer inactive categories too, so editing a post never silently drops a
  // category that has since been deactivated.
  const categories = await db
    .select({ id: newsCategories.id, name: newsCategories.name })
    .from(newsCategories)
    .orderBy(asc(newsCategories.display_order), asc(newsCategories.name));

  return (
    <div>
      <PageHeader title="Edit article" description={`/news/${post.slug}`} />
      <NewsForm
        categories={categories}
        post={{
          id: post.id,
          title: post.title,
          slug: post.slug,
          excerpt: post.excerpt,
          body: post.body,
          cover_image: post.cover_image,
          cover_image_alt: post.cover_image_alt,
          category_id: post.category_id,
          status: post.status as NewsStatus,
          featured: post.featured,
          publish_at: post.publish_at,
          seo_title: post.seo_title,
          seo_description: post.seo_description,
        }}
      />
    </div>
  );
}
