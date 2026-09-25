import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Gallery } from "@/components/public/gallery";
import { ProductCard, type CardProduct } from "@/components/public/product-card";
import { QuoteButton } from "@/components/public/quote-button";
import { ArrowUpRight, Download, FileText, ShieldCheck, Calculator } from "@/components/icons";
import { db } from "@/lib/db";
import { products, brands, categories, productImages, productSpecifications, productDocuments } from "@/db/schema";
import { eq, and, ne, inArray, asc, desc, isNull } from "drizzle-orm";

interface Params {
  brand: string;
  slug: string;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.status, "published")),
    with: { brand: true, category: true },
  });

  if (!product) return { title: "Product not found | Asset Matrix Energy" };
  const brandName = product.brand?.name;
  const title = product.seo_title || (brandName ? `${product.name} — ${brandName}` : product.name);
  const description = product.seo_description || product.short_description || `Request a quote for ${product.name} with Asset Matrix Energy.`;

  return {
    title: `${title} | Asset Matrix Energy`,
    description,
    openGraph: { title, description, type: "website" },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<Params> }) {
  const { brand, slug } = await params;

  const product = await db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.status, "published")),
    with: { brand: true, category: true },
  });

  if (!product) notFound();

  if (product.brand?.slug && product.brand.slug !== brand) redirect(`/products/${product.brand.slug}/${slug}`);
  const brandSlug = product.brand?.slug ?? "";

  const [images, specs, docs, related] = await Promise.all([
    db.select({ id: productImages.id, url: productImages.url, alt: productImages.alt }).from(productImages).where(eq(productImages.product_id, product.id)).orderBy(desc(productImages.is_primary), asc(productImages.display_order)),
    db.select({ id: productSpecifications.id, name: productSpecifications.name, value: productSpecifications.value }).from(productSpecifications).where(eq(productSpecifications.product_id, product.id)).orderBy(asc(productSpecifications.display_order)),
    db.select({ id: productDocuments.id, name: productDocuments.name, url: productDocuments.url, file_type: productDocuments.file_type }).from(productDocuments).where(eq(productDocuments.product_id, product.id)).orderBy(asc(productDocuments.display_order)),
    db
      .select({
        id: products.id,
        name: products.name,
        slug: products.slug,
        short_description: products.short_description,
        brand_name: brands.name,
        brand_slug: brands.slug,
        category_name: categories.name,
      })
      .from(products)
      .innerJoin(brands, eq(products.brand_id, brands.id))
      .leftJoin(categories, eq(products.category_id, categories.id))
      .where(
        and(
          eq(products.status, "published"),
          product.category_id == null ? isNull(products.category_id) : eq(products.category_id, product.category_id),
          ne(products.id, product.id)
        )
      )
      .orderBy(desc(products.created_at))
      .limit(4),
  ]);

  const galleryImages = images.map((img) => ({ url: img.url, alt: img.alt }));
  const relatedIds = related.map((r) => r.id);
  const relatedMap = new Map<string, string>();
  if (relatedIds.length) {
    const relImages = await db
      .select({ product_id: productImages.product_id, url: productImages.url })
      .from(productImages)
      .where(inArray(productImages.product_id, relatedIds))
      .orderBy(desc(productImages.is_primary), asc(productImages.display_order));
    for (const img of relImages) if (!relatedMap.has(img.product_id)) relatedMap.set(img.product_id, img.url);
  }
  const relatedCards: CardProduct[] = related.map((r) => ({
    name: r.name,
    slug: r.slug,
    brandSlug: r.brand_slug ?? "",
    brandName: r.brand_name ?? "",
    categoryName: r.category_name ?? null,
    shortDescription: r.short_description,
    imageUrl: relatedMap.get(r.id) ?? null,
  }));

  return (
    <>
      <Navbar />
      <main>
        <div className="catalogue">
          <nav className="pd-breadcrumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link><span>/</span>
            <Link href="/products">Products</Link><span>/</span>
            <Link href={`/products?brand=${encodeURIComponent(brandSlug)}`}>{product.brand?.name || "Catalogue"}</Link><span>/</span>
            <span>{product.name}</span>
          </nav>

          <div className="pd-layout">
            <div className="pd-media">
              <Gallery images={galleryImages} />
            </div>

            <div className="pd-info">
              <p className="eyebrow">{product.brand?.name || "Asset Matrix Energy"}</p>
              <h1>{product.name}</h1>
              {product.short_description && <p className="pd-desc">{product.short_description}</p>}

              <div className="pd-meta">
                {product.category?.name && <span className="pd-chip">{product.category.name}</span>}
                <span className="pd-chip">Available on request</span>
              </div>

              <QuoteButton
                product={{ id: product.id, name: product.name, brand_name: product.brand?.name }}
                className="button button-accent pd-quote-btn"
                label="Request a quote"
              />

              <div className="pd-assurances">
                <div><ShieldCheck size={18} /><span>Technical sales support</span></div>
                <div><Calculator size={18} /><span>Response within one business day</span></div>
              </div>
            </div>
          </div>

          <div className="pd-sections">
            {specs && specs.length > 0 && (
              <section className="pd-section">
                <h2>Key specifications</h2>
                <div className="spec-wrap">
                  <table className="spec-table">
                    <tbody>
                      {specs.map((s) => (
                        <tr key={s.id}>
                          <th>{s.name}</th>
                          <td>{s.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {product.description && (
              <section className="pd-section">
                <h2>Details</h2>
                <div className="pd-rich" dangerouslySetInnerHTML={{ __html: product.description }} />
              </section>
            )}

            {docs && docs.length > 0 && (
              <section className="pd-section">
                <h2>Documents</h2>
                <ul className="pd-docs">
                  {docs.map((d) => {
                    const type = (d.file_type || "pdf").toUpperCase();
                    return (
                      <li key={d.id}>
                        <a href={d.url} target="_blank" rel="noopener noreferrer" download>
                          <span className="pd-doc-icon"><FileText size={18} /></span>
                          <span className="pd-doc-name">{d.name}<em>.{type.toLowerCase()}</em></span>
                          <span className="pd-doc-dl"><Download size={15} /></span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>

          {relatedCards.length > 0 && (
            <section className="pd-related">
              <h2>You may also like</h2>
              <div className="product-grid">
                {relatedCards.map((rc) => (
                  <ProductCard key={rc.slug} product={rc} />
                ))}
              </div>
            </section>
          )}

          <section className="pd-cta">
            <div className="eyebrow eyebrow-light">Can’t find what you need?</div>
            <h2>We represent specialist brands across reliability, testing, diagnostics and instrumentation.</h2>
            <a className="button button-accent" href="mailto:info@assetmatrixenergy.com">Talk to our team <ArrowUpRight size={16} /></a>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
