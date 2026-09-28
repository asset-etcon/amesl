import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { LabelForm } from "@/components/admin/label-form";

export const metadata = { title: "New label | AMESL Admin" };

export default async function NewLabelPage() {
  await requireRole("labels");
  return (
    <div>
      <PageHeader title="New label" description="Create a label to cross-tag products across brands." />
      <LabelForm />
    </div>
  );
}
