import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { ServiceForm } from "@/components/admin/service-form";

export const metadata = { title: "New service | AMESL Admin" };

export default async function NewServicePage() {
  await requireRole("services_manage");

  return (
    <div>
      <PageHeader title="New service" description="Add a service. It gets its own page on the public website." />
      <ServiceForm />
    </div>
  );
}
