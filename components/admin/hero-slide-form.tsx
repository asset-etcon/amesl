"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ImagePlus } from "lucide-react";
import { heroSlideSchema, type HeroSlideInput } from "@/lib/validators";
import { validateImageFile } from "@/lib/media";
import { uploadFileToStorage } from "@/lib/client-upload";
import { saveHeroSlideAction } from "@/app/admin/(dashboard)/hero-slides/actions";
import { Button, Field, FormSection, Input, Select, Textarea, useToast } from "@/components/admin/ui";

interface SlideRecord {
  id: string;
  image_desktop: string;
  image_mobile: string;
  headline: string;
  subtext: string;
  cta_label: string;
  cta_href: string;
  status: "active" | "inactive";
  display_order: number;
}

export function HeroSlideForm({ slide }: { slide?: SlideRecord }) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = Boolean(slide);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<HeroSlideInput>({
    resolver: zodResolver(heroSlideSchema) as never,
    defaultValues: {
      image_desktop: slide?.image_desktop ?? "",
      image_mobile: slide?.image_mobile ?? "",
      headline: slide?.headline ?? "",
      subtext: slide?.subtext ?? "",
      cta_label: slide?.cta_label ?? "",
      cta_href: slide?.cta_href ?? "",
      status: slide?.status ?? "active",
      display_order: slide?.display_order ?? 1,
    },
  });

  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<"desktop" | "mobile" | null>(null);
  const desktopRef = useRef<HTMLInputElement>(null);
  const mobileRef = useRef<HTMLInputElement>(null);
  const desktopUrl = watch("image_desktop");
  const mobileUrl = watch("image_mobile");

  const upload = async (file: File, field: "image_desktop" | "image_mobile", kind: "desktop" | "mobile") => {
    const error = validateImageFile(file);
    if (error) {
      toast(error, "error");
      return;
    }
    setUploading(kind);
    const uploaded = await uploadFileToStorage("heroImages", file);
    if (!uploaded.ok) {
      toast(uploaded.error, "error");
      setUploading(null);
      return;
    }
    setValue(field, uploaded.url);
    setUploading(null);
  };

  const onValid = async (values: HeroSlideInput) => {
    setBusy(true);
    const result = await saveHeroSlideAction({ id: slide?.id, ...values, image_mobile: values.image_mobile ?? "" });
    setBusy(false);
    if (result.ok) {
      toast(isEdit ? "Slide updated." : "Slide created.");
      router.push("/admin/hero-slides");
      router.refresh();
    } else {
      toast(result.error ?? "Save failed.", "error");
    }
  };

  return (
    <form onSubmit={handleSubmit(onValid)} className="grid max-w-3xl gap-6">
      <FormSection title="Slide content" description="The headline and text appear over the hero image on the homepage.">
        <Field label="Headline" required error={errors.headline?.message}>
          <Input placeholder="e.g. Keeping Critical Infrastructure Performing." {...register("headline")} />
        </Field>
        <Field label="Subtext" error={errors.subtext?.message}>
          <Textarea maxLength={600} rows={3} placeholder="Short supporting sentence shown under the headline." {...register("subtext")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Button label" hint="Leave empty to hide the button." error={errors.cta_label?.message}>
            <Input placeholder="Explore our solutions" {...register("cta_label")} />
          </Field>
          <Field label="Button link" error={errors.cta_href?.message}>
            <Input placeholder="#solutions or https://…" {...register("cta_href")} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Display order" error={errors.display_order?.message}>
            <Input type="number" min={0} max={9999} {...register("display_order")} />
          </Field>
          <Field label="Status">
            <Select {...register("status")}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Images" description="Desktop image is required. A separate mobile image is optional (JPG, PNG or WEBP, max 5 MB).">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <input ref={desktopRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, "image_desktop", "desktop"); e.target.value = ""; }} />
            <p className="mb-1.5 text-[12px] font-bold text-[#41515b]">Desktop image *</p>
            {desktopUrl ? (
              <div className="relative aspect-[16/9] overflow-hidden rounded-lg border border-[#e4e9ea] bg-[#eef1f0]">
                <Image src={desktopUrl} alt="Desktop hero" fill className="object-cover" />
              </div>
            ) : (
              <button type="button" onClick={() => desktopRef.current?.click()} className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#e7a42b] bg-[#e7a42b] text-[#172633] transition-colors hover:border-[#f3bb4e] hover:bg-[#f3bb4e]">
                <ImagePlus size={20} />
                <span className="text-[12px] font-bold">Upload desktop image</span>
              </button>
            )}
            {errors.image_desktop?.message && <em className="text-[11px] font-semibold text-[#b3261e]">{errors.image_desktop.message}</em>}
          </div>
          <div>
            <input ref={mobileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, "image_mobile", "mobile"); e.target.value = ""; }} />
            <p className="mb-1.5 text-[12px] font-bold text-[#41515b]">Mobile image</p>
            {mobileUrl ? (
              <div className="relative aspect-[9/16] max-h-[240px] w-full overflow-hidden rounded-lg border border-[#e4e9ea] bg-[#eef1f0]">
                <Image src={mobileUrl} alt="Mobile hero" fill className="object-cover" />
              </div>
            ) : (
              <button type="button" onClick={() => mobileRef.current?.click()} className="flex aspect-[9/16] max-h-[240px] w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[#e7a42b] bg-[#e7a42b] text-[#172633] transition-colors hover:border-[#f3bb4e] hover:bg-[#f3bb4e]">
                <ImagePlus size={20} />
                <span className="px-4 text-center text-[12px] font-bold">Upload mobile image</span>
              </button>
            )}
          </div>
        </div>
        {uploading && <p className="mt-2 text-[12px] font-semibold text-[#bc7d0b]">Uploading…</p>}
      </FormSection>

      <div className="flex items-center justify-end gap-2">
        <Link href="/admin/hero-slides" className="inline-flex h-10 items-center rounded-lg bg-[#e7a42b] px-4 text-[13.5px] font-bold text-[#172633] hover:bg-[#f3bb4e]">
          Cancel
        </Link>
        <Button type="submit" busy={busy} disabled={uploading !== null}>
          {isEdit ? "Save changes" : "Create slide"}
        </Button>
      </div>
    </form>
  );
}
