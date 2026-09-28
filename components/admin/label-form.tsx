"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { labelSchema, type LabelInput } from "@/lib/validators";
import { saveLabelAction } from "@/app/admin/(dashboard)/labels/actions";
import { Button, Field, FormSection, Input, Select, Textarea, useToast } from "@/components/admin/ui";

export function LabelForm({ label }: { label?: { id: string; name: string; slug: string; description: string; status: "active" | "inactive"; display_order: number } }) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = Boolean(label);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LabelInput>({
    resolver: zodResolver(labelSchema) as never,
    defaultValues: {
      name: label?.name ?? "",
      slug: label?.slug ?? "",
      description: label?.description ?? "",
      status: label?.status ?? "active",
      display_order: label?.display_order ?? 0,
    },
  });

  const [busy, setBusy] = useState(false);

  const onValid = async (values: LabelInput) => {
    setBusy(true);
    const result = await saveLabelAction({ id: label?.id, ...values });
    setBusy(false);
    if (result.ok) {
      toast(isEdit ? "Label updated." : "Label created.");
      router.push("/admin/labels");
      router.refresh();
    } else {
      toast(result.error ?? "Save failed.", "error");
    }
  };

  return (
    <form onSubmit={handleSubmit(onValid)} className="grid max-w-3xl gap-6">
      <FormSection title="Label details" description="Labels appear as clickable chips on product pages and filter the catalogue at /products?label=your-slug.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Label name" required error={errors.name?.message}>
            <Input placeholder="e.g. Thermography" {...register("name")} />
          </Field>
          <Field label="Slug" hint="Leave empty to generate automatically." error={errors.slug?.message}>
            <Input placeholder="auto-generated" {...register("slug")} />
          </Field>
          <Field label="Display order" hint="Lower numbers appear first in the filter." error={errors.display_order?.message}>
            <Input type="number" min={0} max={9999} {...register("display_order")} />
          </Field>
          <Field label="Status" hint="Inactive labels are hidden from product pages and the filter.">
            <Select {...register("status")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Description" error={errors.description?.message}>
            <Textarea maxLength={2000} className="min-h-[100px]" placeholder="What this label is used for. Internal reference only." {...register("description")} />
          </Field>
        </div>
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <Link href="/admin/labels" className="inline-flex h-10 items-center rounded-lg bg-[#e7a42b] px-4 text-[12px] font-bold text-[#172633] hover:bg-[#f3bb4e]">
          Cancel
        </Link>
        <Button type="submit" busy={busy}>
          {isEdit ? "Save changes" : "Create label"}
        </Button>
      </div>
    </form>
  );
}
