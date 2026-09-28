import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { productLabels } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { LabelForm } from "@/components/admin/label-form";

export const metadata = { title: "Edit label | AMESL Admin" };

export default async function EditLabelPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("labels");
  const { id } = await params;
  const label = await db.query.productLabels.findFirst({ where: eq(productLabels.id, id) });
  if (!label) notFound();

  return (
    <div>
      <PageHeader title="Edit label" description={label.name} />
      <LabelForm
        label={{
          id: label.id,
          name: label.name,
          slug: label.slug,
          description: label.description,
          status: label.status as "active" | "inactive",
          display_order: label.display_order,
        }}
      />
    </div>
  );
}
