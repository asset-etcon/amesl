"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button, Card, Field, FormSection, Input, Select, Textarea, useToast } from "@/components/admin/ui";
import { saveNewsCategoryAction } from "@/app/admin/(dashboard)/news/actions";
import { newsCategorySchema, type NewsCategoryInput } from "@/lib/validators";

export interface NewsCategoryFormData {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: "active" | "inactive";
  display_order: number;
}

export function NewsCategoryForm({ category }: { category?: NewsCategoryFormData }) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = Boolean(category);
  const [busy, setBusy] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<
    z.input<typeof newsCategorySchema>,
    unknown,
    z.output<typeof newsCategorySchema>
  >({
    resolver: zodResolver(newsCategorySchema),
    defaultValues: {
      name: category?.name ?? "",
      slug: category?.slug ?? "",
      description: category?.description ?? "",
      status: category?.status ?? "active",
      display_order: category?.display_order ?? 0,
    },
  });

  const onValid = async (values: NewsCategoryInput) => {
    setBusy(true);
    const result = await saveNewsCategoryAction({
      id: category?.id,
      name: values.name,
      slug: values.slug?.trim() || undefined,
      description: values.description,
      status: values.status,
      display_order: values.display_order,
    });
    setBusy(false);
    if (result.ok) {
      toast(isEdit ? "Category updated." : "Category created.");
      router.push("/admin/news-categories");
      router.refresh();
    } else {
      toast(result.error ?? "Save failed.", "error");
    }
  };

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-5">
      <button
        type="button"
        onClick={() => router.push("/admin/news-categories")}
        className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#5d6b73] hover:text-[#152431]"
      >
        <ArrowLeft size={15} /> Back to categories
      </button>

      <Card className="p-5">
        <FormSection title="Category" description="Categories appear as filter links and on their own page at /news/category/…">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required error={errors.name?.message}>
              <Input {...register("name")} placeholder="e.g. Company news" />
            </Field>

            <Field label="Slug" hint="Leave empty to generate from the name." error={errors.slug?.message}>
              <Input {...register("slug")} placeholder="auto-generated" />
            </Field>

            <Field label="Status" hint="Inactive categories are hidden from the public news pages.">
              <Select {...register("status")}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>

            <Field label="Display order" hint="Lower numbers appear first." error={errors.display_order?.message}>
              <Input type="number" min={0} max={9999} {...register("display_order")} />
            </Field>

            <Field
              label="Description"
              hint="Shown on the category page and used as its meta description fallback."
              error={errors.description?.message}
              className="sm:col-span-2"
            >
              <Textarea rows={3} {...register("description")} placeholder="What belongs in this category?" />
            </Field>
          </div>
        </FormSection>
      </Card>

      <div className="flex items-center justify-end gap-2 pb-4">
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/news-categories")}>
          Cancel
        </Button>
        <Button type="submit" busy={busy}>
          {isEdit ? "Save changes" : "Create category"}
        </Button>
      </div>
    </form>
  );
}
