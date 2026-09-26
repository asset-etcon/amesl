import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { newsPosts, newsCategories } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { newsOrder, newsPublishedAt, publishedNewsWhere } from "@/lib/news";
import { formatDate } from "@/lib/utils";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/public/json-ld";
import { ArrowUpRight } from "@/components/icons";

const siteUrl = (process.env.SITE_URL ?? "https://assetmatrixenergy.com").replace(/\/+$/, "");

interface Params {
  slug: string;
}

async function loadCategory(slug: string) {
  const rows = await db
    .select({ id: newsCategories.id, name: newsCategories.name, slug: newsCategories.slug, description: newsCategories.description, status: newsCategories.status })
    .from(newsCategories)
    .where(and(eq(newsCategories.slug, slug), eq(newsCategories.status, "active")))
    .limit(1);
  return rows[0];
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await loadCategory(slug);
  if (!category) return { title: "Category not found" };

  const title = `${category.name} News`;
  const description = category.description || `The latest ${category.name.toLowerCase()} news and updates from Asset Matrix Energy.`;
  const url = `/news/category/${category.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
  };
}

export default async function NewsCategoryPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const category = await loadCategory(slug);
  if (!category) notFound();

  const posts = await db
    .select({
      id: newsPosts.id,
      title: newsPosts.title,
      slug: newsPosts.slug,
      excerpt: newsPosts.excerpt,
      publish_at: newsPosts.publish_at,
      created_at: newsPosts.created_at,
    })
    .from(newsPosts)
    .where(and(eq(newsPosts.category_id, category.id), publishedNewsWhere()))
    .orderBy(...newsOrder);

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${category.name} News`,
    description: category.description || `${category.name} news from Asset Matrix Energy.`,
    url: `${siteUrl}/news/category/${category.slug}`,
  };

  return (
    <>
      <Navbar />
      <main>
        <JsonLd data={collectionLd} />
        <section className="ab-hero">
          <p className="eyebrow eyebrow-light">News category</p>
          <h1>{category.name}</h1>
          {category.description ? <p>{category.description}</p> : null}
        </section>

        <section className="so-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <span />
                {category.name}
              </p>
              <h2>
                Latest {category.name.toLowerCase()}
                <br />
                updates.
              </h2>
            </div>
            <Link className="text-link" href="/news" style={{ marginTop: 0 }}>
              All news <ArrowUpRight size={14} />
            </Link>
          </div>

          {posts.length === 0 ? (
            <p className="nw-more" style={{ marginTop: 44 }}>
              No published posts in this category yet.
            </p>
          ) : (
            <div className="nw-list">
              {posts.map((post) => {
                const published = newsPublishedAt({ publish_at: post.publish_at, created_at: post.created_at });
                return (
                  <article className="nw-card" key={post.id}>
                    <span className="nw-chip">{category.name}</span>
                    <h3>
                      <Link href={`/news/${post.slug}`}>{post.title}</Link>
                    </h3>
                    <p>{post.excerpt.slice(0, 160)}</p>
                    <div className="nw-meta">
                      <time dateTime={published.toISOString()}>{formatDate(published.toISOString())}</time>
                      <Link href={`/news/${post.slug}`} aria-label={`Read ${post.title}`}>
                        Read more <ArrowUpRight size={14} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
