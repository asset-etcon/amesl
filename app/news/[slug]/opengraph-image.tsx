import { ImageResponse } from "next/og";
import { db } from "@/lib/db";
import { newsPosts } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { publishedNewsWhere } from "@/lib/news";

/**
 * Generates the 1200×630 social card for a news post at request time.
 *
 * The cover image is remote (R2), and `next/og` cannot fetch arbitrary remote
 * URLs without them being allow-listed, so a network failure must not take the
 * whole image down: on any error the card falls back to a branded typographic
 * layout built only from text.
 */
export const runtime = "nodejs";
export const alt = "Asset Matrix Energy news article";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function NewsOpengraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let title = "Asset Matrix Energy";
  let category: string | null = null;
  try {
    const rows = await db
      .select({ title: newsPosts.title, seo_title: newsPosts.seo_title, category: newsPosts.category_id })
      .from(newsPosts)
      .where(and(eq(newsPosts.slug, slug), publishedNewsWhere()))
      .limit(1);
    if (rows[0]) {
      title = rows[0].seo_title || rows[0].title;
      category = rows[0].category ? "News" : null;
    }
  } catch {
    // fall through to the default title
  }

  // Trim to a few lines so an over-long headline does not overflow the canvas.
  const display = title.length > 110 ? `${title.slice(0, 107).trimEnd()}…` : title;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #0b1b29 0%, #14364a 58%, #1b4a5e 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 26, letterSpacing: "0.18em", textTransform: "uppercase", color: "#e7a42b" }}>
          <div style={{ width: 46, height: 3, background: "#e7a42b" }} />
          {category ?? "News"}
        </div>
        <div style={{ display: "flex", fontSize: display.length > 70 ? 58 : 72, lineHeight: 1.12, fontWeight: 500, letterSpacing: "-0.02em" }}>
          {display}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 24, color: "rgba(255,255,255,0.72)" }}>
          <span>Asset Matrix Energy</span>
          <span>assetmatrixenergy.com</span>
        </div>
      </div>
    ),
    size,
  );
}
