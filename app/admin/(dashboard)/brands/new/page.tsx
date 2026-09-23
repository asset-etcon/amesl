import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { BrandForm } from "@/components/admin/brand-form";

export const metadata = { title: "New brand | AMESL Admin" };

export default async function NewBrandPage() {
  await requireRole("brands");
  return (
    <div>
      <PageHeader title="New brand" description="Add a technology partner represented by AMESL." />
      <BrandForm />
    </div>
  );
}