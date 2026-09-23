"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus, Trash2 } from "lucide-react";
import { brandSchema, type BrandInput } from "@/lib/validators";
import { validateImageFile } from "@/lib/media";
import { uploadFileToStorage } from "@/lib/client-upload";
import { saveBrandAction } from "@/app/admin/(dashboard)/brands/actions";
import { Button, Field, FormSection, Input, Select, Textarea, useToast } from "@/components/admin/ui";

export function BrandForm({ brand }: { brand?: { id: string; name: string; slug: string; description: string; website: string; logo_url: string; status: "active" | "inactive"; display_order: number } }) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = Boolean(brand);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BrandInput>({
    resolver: zodResolver(brandSchema) as never,
    defaultValues: {
      name: brand?.name ?? "",
      slug: brand?.slug ?? "",
      description: brand?.description ?? "",
      website: brand?.website ?? "",
      logo_url: brand?.logo_url ?? "",
      status: brand?.status ?? "active",
      display_order: brand?.display_order ?? 0,
    },
  });

  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const logoUrl = watch("logo_url");

  const uploadLogo = async (file: File) => {
    const error = validateImageFile(file);
    if (error) {
      toast(error, "error");
      return;
    }
    setUploading(true);
    const uploaded = await uploadFileToStorage("brandLogos", file);
    if (!uploaded.ok) {
      toast(uploaded.error, "error");
      setUploading(false);
      return;
    }
    setValue("logo_url", uploaded.url);
    setUploading(false);
  };

  const onValid = async (values: BrandInput) => {
    setBusy(true);
    const result = await saveBrandAction({ id: brand?.id, ...values });
    setBusy(false);
    if (result.ok) {
      toast(isEdit ? "Brand updated." : "Brand created.");
      router.push("/admin/brands");
      router.refresh();
    } else {
      toast(result.error ?? "Save failed.", "error");
    }
  };

  return (
    <form onSubmit={handleSubmit(onValid)} className="grid max-w-3xl gap-6">
      <FormSection title="Brand details" description="Brands are the technology partners of AMESL represented in the catalogue.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Brand name" required error={errors.name?.message}>
            <Input placeholder="e.g. Doble" {...register("name")} />
          </Field>
          <Field label="Slug" hint="Leave empty to generate automatically." error={errors.slug?.message}>
            <Input placeholder="auto-generated" {...register("slug")} />
          </Field>
          <Field label="Website" error={errors.website?.message}>
            <Input placeholder="https://…" {...register("website")} />
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
          <div className="flex items-end">
            <p className="text-[12px] text-[#8a969c]">Inactive brands are hidden from the public site.</p>
          </div>
        </div>
        <div className="mt-4">
          <Field label="Description" error={errors.description?.message}>
            <Textarea maxLength={2000} className="min-h-[100px]" placeholder="Who this partner is and what they supply." {...register("description")} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Logo" description="Square logo image (JPG, PNG or WEBP, max 5 MB).">
        <div className="flex items-center gap-4">
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadLogo(f); e.target.value = ""; }} />
          {logoUrl ? (
            <>
              <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-[#e4e9ea] bg-[#f2f4f3]">
                <Image src={logoUrl} alt="Brand logo" fill className="object-contain" unoptimized />
              </div>
              <button type="button" onClick={() => setValue("logo_url", "")} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-bold text-[#b3261e] hover:bg-[#fdeceb]">
                <Trash2 size={14} /> Remove
              </button>
            </>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} busy={uploading}>
              <ImagePlus size={14} /> Upload logo
            </Button>
          )}
        </div>
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <Link href="/admin/brands" className="inline-flex h-10 items-center rounded-lg px-4 text-[13.5px] font-bold text-[#41515b] hover:bg-[#f2f4f3]">
          Cancel
        </Link>
        <Button type="submit" busy={busy}>
          {isEdit ? "Save changes" : "Create brand"}
        </Button>
      </div>
    </form>
  );
}