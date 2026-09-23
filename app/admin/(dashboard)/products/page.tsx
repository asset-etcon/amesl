import Link from "next/link";
import { Plus } from "lucide-react";
import { and, asc, count, desc, eq, ilike, inArray, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { brands, categories, productImages, products } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { ProductFilters } from "@/components/admin/product-filters";
import { ProductTable, type ProductRow } from "@/components/admin/product-table";

export const metadata = { title: "Products | AMESL Admin" };

const PER_PAGE = 12;

interface SearchParams {
  q?: string;
  brand?: string;
  category?: string;
  status?: string;
  featured?: string;
  page?: string;
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const { profile } = await requireRole("products");
  const canManage = can(profile.role, "products_manage");

  const page = Math.max(1, Number(params.page) || 1);
  const from = (page - 1) * PER_PAGE;

  const conditions: SQL[] = [];
  if (params.q) conditions.push(ilike(products.name, `%${params.q}%`));
  if (params.status) conditions.push(eq(products.status, params.status));
  if (params.brand) conditions.push(eq(products.brand_id, params.brand));
  if (params.category) conditions.push(eq(products.category_id, params.category));
  if (params.featured === "true") conditions.push(eq(products.featured, true));
  if (params.featured === "false") conditions.push(eq(products.featured, false));
  const where = conditions.length ? and(...conditions) : undefined;

  const [countRows, productRows, brandRows, categoryRows] = await Promise.all([
    db.select({ value: count() }).from(products).where(where),
    db.query.products.findMany({
      where,
      with: { brand: true, category: true },
      orderBy: desc(products.updated_at),
      limit: PER_PAGE,
      offset: from,
    }),
    db.select({ id: brands.id, name: brands.name }).from(brands).orderBy(asc(brands.name)),
    db.select({ id: categories.id, name: categories.name }).from(categories).orderBy(asc(categories.name)),
  ]);

  const brandsList = brandRows.map((b) => ({ id: b.id, name: b.name }));
  const categoriesList = categoryRows.map((c) => ({ id: c.id, name: c.name }));
  const idList = productRows.map((p) => p.id);

  const imageMap = new Map<string, string>();
  if (idList.length) {
    const imageRows = await db
      .select({ product_id: productImages.product_id, url: productImages.url })
      .from(productImages)
      .where(inArray(productImages.product_id, idList))
      .orderBy(desc(productImages.is_primary), asc(productImages.display_order));
    for (const im of imageRows) {
      if (!imageMap.has(im.product_id)) imageMap.set(im.product_id, im.url);
    }
  }

  const rows: ProductRow[] = productRows.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    status: p.status as ProductRow["status"],
    featured: p.featured,
    updated_at: p.updated_at,
    brand_name: p.brand?.name ?? null,
    brand_slug: p.brand?.slug ?? null,
    category_name: p.category?.name ?? null,
    primary_image: imageMap.get(p.id) ?? null,
  }));

  const total = countRows[0]?.value ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const current = {
    q: params.q,
    brand: params.brand,
    category: params.category,
    status: params.status,
    featured: params.featured,
  };

  return (
    <div>
      <PageHeader
        title="Products"
        description={`${total.toLocaleString()} product${total === 1 ? "" : "s"} in the catalogue.`}
        actions={
          canManage ? (
            <Link href="/admin/products/new" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0b1b29] px-4 text-[13.5px] font-bold text-white hover:bg-[#1c4052]">
              <Plus size={16} /> New product
            </Link>
          ) : undefined
        }
      />

      <ProductFilters current={current} brands={brandsList} categories={categoriesList} />
      <ProductTable rows={rows} page={page} pageCount={pageCount} total={total} canManage={canManage} />
    </div>
  );
}