import Link from "next/link";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { services } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { ServiceTable, type ServiceTableRow } from "@/components/admin/service-table";
import { serviceOrder } from "@/lib/services";

export const metadata = { title: "Services | AMESL Admin" };

export default async function AdminServicesPage() {
  const { profile } = await requireRole("services");
  const canManage = can(profile.role, "services_manage");

  const rows = await db
    .select({
      id: services.id,
      name: services.name,
      slug: services.slug,
      icon: services.icon,
      status: services.status,
      display_order: services.display_order,
      updated_at: services.updated_at,
    })
    .from(services)
    .orderBy(...serviceOrder);

  const tableRows: ServiceTableRow[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    icon: row.icon,
    status: row.status as ServiceTableRow["status"],
    displayOrder: row.display_order,
    updatedAt: row.updated_at,
  }));

  const live = tableRows.filter((r) => r.status === "active").length;
  const summary = [
    `${tableRows.length} ${tableRows.length === 1 ? "service" : "services"}`,
    live ? `${live} live` : "none live",
    tableRows.length - live ? `${tableRows.length - live} hidden` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <PageHeader
        title="Services"
        description={summary}
        actions={
          canManage ? (
            <Link
              href="/admin/services/new"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#e7a42b] px-4 text-[13.5px] font-bold text-[#172633] hover:bg-[#f3bb4e]"
            >
              <Plus size={16} /> New service
            </Link>
          ) : undefined
        }
      />
      <ServiceTable rows={tableRows} canManage={canManage} />
    </div>
  );
}
