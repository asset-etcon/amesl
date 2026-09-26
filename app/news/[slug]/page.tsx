import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { newsPosts, newsCategories } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { isNewsVisible, newsPublishedAt, publishedNewsWhere } from "@/lib/news";
import { toIsoTimestamp } from "@/lib/dates";
import { formatDate } from "@/lib/utils";
import { sanitizeRichText } from "@/lib/sanitize";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/public/json-ld";
import { ArrowUpRight } from "@/components/icons";

const siteUrl = (process.env.SITE_URL ?? "https://assetmatrixenergy.com").replace(/\/+$/, "");

interface Params {
  slug: string;
}

type PostRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  cover_image: string;
  cover_image_alt: string;
  category_id: string | null;
  status: string;
  publish_at: string | null;
  seo_title: string;
  seo_description: string;
  created_at: string;
  category_name: string | null;
  category_slug: string | null;
};

async function loadPost(slug: string): Promise<PostRow | undefined> {
  const rows = await db
    .select({
      id: newsPosts.id,
      title: newsPosts.title,
      slug: newsPosts.slug,
      excerpt: newsPosts.excerpt,
      body: newsPosts.body,
      cover_image: newsPosts.cover_image,
      cover_image_alt: newsPosts.cover_image_alt,
      category_id: newsPosts.category_id,
      status: newsPosts.status,
      publish_at: newsPosts.publish_at,
      seo_title: newsPosts.seo_title,
      seo_description: newsPosts.seo_description,
      created_at: newsPosts.created_at,
      category_name: newsCategories.name,
      category_slug: newsCategories.slug,
    })
    .from(newsPosts)
    .leftJoin(newsCategories, eq(newsPosts.category_id, newsCategories.id))
    .where(and(eq(newsPosts.slug, slug), publishedNewsWhere()))
    .limit(1);
  return rows[0];
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await loadPost(slug);
  if (!post) return { title: "News not found" };

  const title = post.seo_title || post.title;
  const description =
    post.seo_description || post.excerpt || `Read the latest update from Asset Matrix Energy.`;
  const url = `/news/${post.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      publishedTime: newsPublishedAt({ publish_at: post.publish_at, created_at: post.created_at }).toISOString(),
      images: post.cover_image ? [{ url: post.cover_image, alt: post.cover_image_alt || post.title }] : undefined,
    },
    twitter: {
      card: post.cover_image ? "summary_large_image" : "summary",
      title,
      description,
      images: post.cover_image ? [post.cover_image] : undefined,
    },
  };
}

export default async function NewsPostPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = await loadPost(slug);
  // A draft, archived or not-yet-scheduled post must 404, not render. The
  // `publishedNewsWhere()` in loadPost already filters these out, so reaching
  // `notFound()` means the slug genuinely does not exist.
  if (!post || !isNewsVisible({ status: post.status, publish_at: post.publish_at })) notFound();

  // Defence in depth: the body was sanitised on write, but re-sanitising on read
  // means a row inserted by a migration, a manual fix or a future import can
  // never introduce stored XSS.
  const safeBody = sanitizeRichText(post.body);

  const published = newsPublishedAt({ publish_at: post.publish_at, created_at: post.created_at });

  const related = await db
    .select({
      id: newsPosts.id,
      title: newsPosts.title,
      slug: newsPosts.slug,
      excerpt: newsPosts.excerpt,
      publish_at: newsPosts.publish_at,
      created_at: newsPosts.created_at,
    })
    .from(newsPosts)
    .where(and(publishedNewsWhere(), post.category_id ? eq(newsPosts.category_id, post.category_id) : undefined))
    .orderBy(desc(newsPosts.publish_at), desc(newsPosts.created_at))
    .limit(4)
    .then((rows) => rows.filter((row) => row.id !== post.id).slice(0, 3));

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: post.title.slice(0, 110),
    description: post.seo_description || post.excerpt || undefined,
    image: post.cover_image ? [post.cover_image] : undefined,
    datePublished: published.toISOString(),
    // Normalised, not the raw column: `timestamptz` arrives as Postgres text
    // ("2026-09-23 16:18:44.799753+00"), which is not a valid ISO 8601 date and
    // makes Google treat the article's structured data as malformed.
    dateModified: toIsoTimestamp(post.publish_at ?? post.created_at, published.toISOString()),
    mainEntityOfPage: { "@type": "WebPage", "@id": `${siteUrl}/news/${post.slug}` },
    author: { "@type": "Organization", name: "Asset Matrix Energy" },
    publisher: {
      "@type": "Organization",
      name: "Asset Matrix Energy",
      logo: { "@type": "ImageObject", url: `${siteUrl}/Asset%20Matrix%20Energy%20logo.png` },
    },
    articleSection: post.category_name ?? undefined,
  };

  return (
    <>
      <Navbar />
      <main>
        <JsonLd data={articleLd} />
        <article className="so-section" style={{ paddingTop: 72 }}>
          <div style={{ maxWidth: 760, marginInline: "auto" }}>
            <p className="eyebrow" style={{ marginBottom: 18 }}>
              {post.category_slug ? (
                <Link href={`/news/category/${post.category_slug}`}>{post.category_name}</Link>
              ) : (
                <>
                  <span />
                  News
                </>
              )}
            </p>
            <h1
              style={{
                fontSize: "clamp(30px,4.2vw,52px)",
                lineHeight: 1.1,
                letterSpacing: "-.045em",
                fontWeight: 500,
                color: "var(--navy)",
                margin: "0 0 20px",
              }}
            >
              {post.title}
            </h1>
            <p style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 12, color: "var(--muted)", margin: "0 0 34px" }}>
              <time dateTime={published.toISOString()}>{formatDate(published.toISOString())}</time>
              <span aria-hidden="true">·</span>
              <span>Asset Matrix Energy</span>
            </p>

            {post.cover_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.cover_image}
                alt={post.cover_image_alt || post.title}
                style={{ width: "100%", height: 380, objectFit: "cover", border: "1px solid var(--line)" }}
              />
            ) : null}

            {post.excerpt ? (
              <p style={{ fontSize: 17, lineHeight: 1.75, color: "#4a5860", margin: "30px 0 0", fontWeight: 500 }}>
                {post.excerpt}
              </p>
            ) : null}

            {safeBody ? (
              <div className="nw-body" dangerouslySetInnerHTML={{ __html: safeBody }} />
            ) : null}

            <div style={{ marginTop: 44, paddingTop: 22, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center" }}>
              <Link className="text-link" href="/news" style={{ marginTop: 0 }}>
                Back to all news <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </article>

        {related.length ? (
          <section className="so-section" style={{ paddingTop: 0 }}>
            <div className="section-heading" style={{ marginBottom: 0 }}>
              <div>
                <p className="eyebrow">
                  <span />
                  Related
                </p>
                <h2 style={{ fontSize: 32 }}>More from Asset Matrix Energy.</h2>
              </div>
            </div>
            <div className="nw-list" style={{ marginTop: 32 }}>
              {related.map((item) => (
                <article className="nw-card" key={item.id}>
                  <span className="nw-chip">
                    {post.category_name ?? "Update"}
                  </span>
                  <h3>
                    <Link href={`/news/${item.slug}`}>{item.title}</Link>
                  </h3>
                  <p>{item.excerpt.slice(0, 140)}</p>
                  <div className="nw-meta">
                    <time dateTime={newsPublishedAt(item).toISOString()}>{formatDate(newsPublishedAt(item).toISOString())}</time>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <Footer />
    </>
  );
}
