import Link from "next/link";
import { ChevronRight, Images, Sparkles } from "lucide-react";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { brands, heroSlides, homepageFeaturedProducts, productImages, products } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { FeaturedProducts, type FeaturedRow } from "@/components/admin/featured-products";

export const metadata = { title: "Homepage | AMESL Admin" };

export default async function HomepagePage() {
  const { profile } = await requireRole("homepage");
  const canManage = can(profile.role, "homepage");

  const [activeCountRows, featured, allProducts] = await Promise.all([
    db.select({ value: count() }).from(heroSlides).where(eq(heroSlides.status, "active")),
    db
      .select({
        display_order: homepageFeaturedProducts.display_order,
        product_id: products.id,
        name: products.name,
        slug: products.slug,
        featured: products.featured,
        brand_name: brands.name,
      })
      .from(homepageFeaturedProducts)
      .innerJoin(products, eq(homepageFeaturedProducts.product_id, products.id))
      .leftJoin(brands, eq(products.brand_id, brands.id))
      .orderBy(asc(homepageFeaturedProducts.display_order)),
    db
      .select({ id: products.id, name: products.name, status: products.status, featured: products.featured })
      .from(products)
      .where(eq(products.status, "published")),
  ]);

  const activeCount = activeCountRows[0]?.value ?? 0;

  const featuredIds = featured.map((r) => r.product_id);
  const primaryImages = featuredIds.length
    ? await db
        .select({ product_id: productImages.product_id, url: productImages.url })
        .from(productImages)
        .where(and(inArray(productImages.product_id, featuredIds), eq(productImages.is_primary, true)))
    : [];
  const imageByProduct = new Map(primaryImages.map((i) => [i.product_id, i.url]));

  const rows: FeaturedRow[] = featured.map((r) => ({
    product_id: r.product_id,
    name: r.name,
    brand_name: r.brand_name ?? "",
    slug: r.slug,
    image_url: imageByProduct.get(r.product_id) ?? null,
    display_order: r.display_order,
  }));

  const options = allProducts
    .filter((p) => !rows.some((r) => r.product_id === p.id))
    .map((p) => ({ product_id: p.id, name: p.name }));

  return (
    <div>
      <PageHeader
        title="Homepage"
        description="Control the hero banner and the products featured on the website homepage."
        actions={
          canManage ? (
            <Link href="/admin/hero-slides/new" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#e7a42b] px-4 text-[13.5px] font-bold text-[#172633] hover:bg-[#f3bb4e]">
              <Images size={16} /> New hero slide
            </Link>
          ) : undefined
        }
      />

      <div className="grid items-start gap-6">
        <Link href="/admin/hero-slides" className="group flex items-center justify-between rounded-xl border border-[#e4e9ea] bg-white p-5 shadow-[0_1px_2px_rgba(11,27,41,0.04)] transition-shadow hover:shadow-[0_8px_24px_rgba(11,27,41,0.08)]">
          <div className="flex items-center gap-4">
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-[#f2f4f3] text-[#bc7d0b]">
              <Images size={20} />
            </span>
            <div>
              <h2 className="text-[14.5px] font-extrabold text-[#0b1b29]">Hero slides</h2>
              <p className="text-[12px] text-[#8a969c]">{activeCount} active slide{activeCount === 1 ? "" : "s"} in the rotating banner</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-[#c2cacc] transition-transform group-hover:translate-x-1" />
        </Link>

        <section>
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={15} className="text-[#bc7d0b]" />
            <h2 className="text-[12px] font-extrabold uppercase tracking-wide text-[#41515b]">Featured products</h2>
          </div>
          <FeaturedProducts rows={rows} options={options} />
        </section>
      </div>
    </div>
  );
}
