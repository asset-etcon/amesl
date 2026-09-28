import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { services } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { ServiceForm, type ServiceFormService } from "@/components/admin/service-form";

export const metadata = { title: "Edit service | AMESL Admin" };

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("services_manage");
  const { id } = await params;

  // Inactive services are hidden from the public site but must stay editable
  // here, so this lookup deliberately does not filter on status.
  const rows = await db.select().from(services).where(eq(services.id, id)).limit(1);
  const service = rows[0];
  if (!service) notFound();

  const formService: ServiceFormService = {
    id: service.id,
    name: service.name,
    slug: service.slug,
    summary: service.summary,
    icon: service.icon,
    overview: service.overview,
    scope: service.scope,
    method: service.method,
    deliverables: service.deliverables,
    image: service.image,
    image_alt: service.image_alt,
    status: service.status as ServiceFormService["status"],
    display_order: service.display_order,
    seo_title: service.seo_title,
    seo_description: service.seo_description,
  };

  return (
    <div>
      <PageHeader title="Edit service" description={`/services/${service.slug}`} />
      <ServiceForm service={formService} />
    </div>
  );
}
