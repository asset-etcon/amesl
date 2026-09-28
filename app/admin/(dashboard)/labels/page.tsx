import Link from "next/link";
import { Plus } from "lucide-react";
import { asc, count } from "drizzle-orm";
import { db } from "@/lib/db";
import { productLabels, productLabelAssignments } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { LabelTable, type LabelRow } from "@/components/admin/label-table";

export const metadata = { title: "Labels | AMESL Admin" };

export default async function LabelsPage() {
  const { profile } = await requireRole("labels");
  const canManage = can(profile.role, "labels");

  const [labelRows, counts] = await Promise.all([
    db.select().from(productLabels).orderBy(asc(productLabels.display_order), asc(productLabels.name)),
    db
      .select({ label_id: productLabelAssignments.label_id, total: count() })
      .from(productLabelAssignments)
      .groupBy(productLabelAssignments.label_id),
  ]);

  const countByLabel = new Map(counts.map((c) => [c.label_id, c.total]));

  const rows: LabelRow[] = labelRows.map((l) => ({
    id: l.id,
    name: l.name,
    slug: l.slug,
    description: l.description,
    status: l.status as "active" | "inactive",
    display_order: l.display_order,
    productCount: countByLabel.get(l.id) ?? 0,
  }));

  return (
    <div>
      <PageHeader
        title="Labels"
        description={`${rows.length} product labels. Labels cross-tag products across brands and appear as clickable chips on product pages.`}
        actions={
          canManage ? (
            <Link href="/admin/labels/new" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#e7a42b] px-4 text-[13.5px] font-bold text-[#172633] hover:bg-[#f3bb4e]">
              <Plus size={16} /> New label
            </Link>
          ) : undefined
        }
      />
      <LabelTable rows={rows} />
    </div>
  );
}
