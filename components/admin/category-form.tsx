"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema, type CategoryInput } from "@/lib/validators";
import { saveCategoryAction } from "@/app/admin/(dashboard)/categories/actions";
import { Button, Field, FormSection, Input, Select, Textarea, useToast } from "@/components/admin/ui";

export function CategoryForm({ category }: { category?: { id: string; name: string; slug: string; description: string; status: "active" | "inactive"; display_order: number } }) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = Boolean(category);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema) as never,
    defaultValues: {
      name: category?.name ?? "",
      slug: category?.slug ?? "",
      description: category?.description ?? "",
      status: category?.status ?? "active",
      display_order: category?.display_order ?? 0,
    },
  });

  const [busy, setBusy] = useState(false);

  const onValid = async (values: CategoryInput) => {
    setBusy(true);
    const result = await saveCategoryAction({ id: category?.id, ...values });
    setBusy(false);
    if (result.ok) {
      toast(isEdit ? "Category updated." : "Category created.");
      router.push("/admin/categories");
      router.refresh();
    } else {
      toast(result.error ?? "Save failed.", "error");
    }
  };

  return (
    <form onSubmit={handleSubmit(onValid)} className="grid max-w-3xl gap-6">
      <FormSection title="Category details">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category name" required error={errors.name?.message}>
            <Input placeholder="e.g. Condition Monitoring" {...register("name")} />
          </Field>
          <Field label="Slug" hint="Leave empty to generate automatically." error={errors.slug?.message}>
            <Input placeholder="auto-generated" {...register("slug")} />
          </Field>
          <Field label="Display order" hint="Lower numbers appear first." error={errors.display_order?.message}>
            <Input type="number" min={0} max={9999} {...register("display_order")} />
          </Field>
          <Field label="Status">
            <Select {...register("status")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Description" error={errors.description?.message}>
            <Textarea maxLength={2000} className="min-h-[100px]" placeholder="What kind of products sit in this category." {...register("description")} />
          </Field>
        </div>
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <Link href="/admin/categories" className="inline-flex h-10 items-center rounded-lg bg-[#e7a42b] px-4 text-[12px] font-bold text-[#172633] hover:bg-[#f3bb4e]">
          Cancel
        </Link>
        <Button type="submit" busy={busy}>
          {isEdit ? "Save changes" : "Create category"}
        </Button>
      </div>
    </form>
  );
}
