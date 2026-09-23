import Link from "next/link";
import { Plus } from "lucide-react";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { brands, products } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { BrandTable, type BrandRow } from "@/components/admin/brand-table";

export const metadata = { title: "Brands | AMESL Admin" };

export default async function BrandsPage() {
  const { profile } = await requireRole("brands");
  const canManage = can(profile.role, "brands");

  const [brandRows, productRows] = await Promise.all([
    db.select().from(brands).orderBy(asc(brands.display_order)),
    db.select({ brand_id: products.brand_id }).from(products),
  ]);

  const counts = new Map<string, number>();
  for (const p of productRows) {
    counts.set(p.brand_id, (counts.get(p.brand_id) ?? 0) + 1);
  }

  const rows: BrandRow[] = brandRows.map((b) => ({
    id: b.id,
    name: b.name,
    website: b.website,
    logo_url: b.logo_url,
    status: b.status as "active" | "inactive",
    display_order: b.display_order,
    product_count: counts.get(b.id) ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title="Brands"
        description={`${rows.length} technology partners${rows.length === 1 ? "" : "s"} in the catalogue.`}
        actions={
          canManage ? (
            <Link href="/admin/brands/new" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0b1b29] px-4 text-[13.5px] font-bold text-white hover:bg-[#1c4052]">
              <Plus size={16} /> New brand
            </Link>
          ) : undefined
        }
      />
      <BrandTable rows={rows} />
    </div>
  );
}
