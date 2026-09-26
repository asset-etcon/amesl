import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { ArrowUpRight } from "@/components/icons";
import { db } from "@/lib/db";
import { newsPosts, newsCategories } from "@/db/schema";
import { activeNewsCategoryWhere, newsOrder, newsPublishedAt, publishedNewsWhere } from "@/lib/news";
import { eq } from "drizzle-orm";
import { formatDate } from "@/lib/utils";
import { sanitizeToText } from "@/lib/sanitize";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "News & Updates",
  description: "Latest updates from Asset Matrix Energy — new products, partnerships, training and company announcements.",
  alternates: { canonical: "/news" },
  openGraph: { title: "News & Updates", description: "Latest updates from Asset Matrix Energy.", url: "/news" },
};

export default async function NewsPage() {
  const now = new Date();
  const posts = await db
    .select({
      id: newsPosts.id,
      title: newsPosts.title,
      slug: newsPosts.slug,
      excerpt: newsPosts.excerpt,
      cover_image: newsPosts.cover_image,
      category_id: newsPosts.category_id,
      publish_at: newsPosts.publish_at,
      created_at: newsPosts.created_at,
      category_name: newsCategories.name,
      category_slug: newsCategories.slug,
    })
    .from(newsPosts)
    .leftJoin(newsCategories, eq(newsPosts.category_id, newsCategories.id))
    .where(publishedNewsWhere(now))
    .orderBy(...newsOrder);

  return (
    <>
      <Navbar />
      <main>
        <section className="ab-hero">
          <p className="eyebrow eyebrow-light">News & updates</p>
          <h1>
            The latest from <em>AMESL.</em>
          </h1>
          <p>New products, partnerships, training and company announcements — all in one place.</p>
        </section>

        <section className="so-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                <span />
                Latest updates
              </p>
              <h2>
                What’s new at Asset
                <br />
                Matrix Energy.
              </h2>
            </div>
            <p>Keep up with developments across our products, services and training.</p>
          </div>

          {posts.length === 0 ? (
            <p className="nw-more" style={{ marginTop: 44 }}>
              No published news yet. Check back soon.
            </p>
          ) : (
            <div className="nw-list">
              {posts.map((post) => {
                const published = newsPublishedAt({ publish_at: post.publish_at, created_at: post.created_at });
                const excerpt = post.excerpt || sanitizeToText(post.excerpt || "").slice(0, 160);
                const chip = post.category_name || "Update";
                return (
                  <article className="nw-card" key={post.id}>
                    {post.cover_image ? (
                      <div className="nw-cover">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={post.cover_image} alt="" loading="lazy" decoding="async" />
                      </div>
                    ) : null}
                    <span className="nw-chip">{chip}</span>
                    <h3>
                      <Link href={`/news/${post.slug}`}>{post.title}</Link>
                    </h3>
                    <p>{excerpt}</p>
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

          <p className="nw-more">
            Want to know more? We’d be happy to speak with you.
            <a href="/contact">
              Get in touch <ArrowUpRight size={14} />
            </a>
          </p>
        </section>

        <section className="pd-cta">
          <div className="eyebrow eyebrow-light">Don’t miss the next update</div>
          <h2>Questions about our products, services or training?</h2>
          <a className="button button-accent" href="/contact">
            Contact our team <ArrowUpRight size={16} />
          </a>
        </section>
      </main>
      <Footer />
    </>
  );
}
