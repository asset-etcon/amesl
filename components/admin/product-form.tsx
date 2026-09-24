"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, FileText, ImagePlus, Plus, Star, Trash2, Upload } from "lucide-react";
import { productSchema, type ProductInput } from "@/lib/validators";
import { validateDocFile, validateImageFile } from "@/lib/media";
import { uploadFileToStorage } from "@/lib/client-upload";
import { saveProductAction, type ProductPayload } from "@/app/admin/(dashboard)/products/actions";
import { Button, Card, EmptyState, Field, FormSection, Input, Select, Switch, Textarea, useToast } from "@/components/admin/ui";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { MediaPicker } from "@/components/admin/media-picker";

export interface FormProduct {
  id: string;
  name: string;
  slug: string;
  brand_id: string;
  category_id: string | null;
  short_description: string;
  description: string;
  status: "draft" | "published" | "archived";
  featured: boolean;
  seo_title: string;
  seo_description: string;
  images: { id: string; url: string; alt: string; is_primary: boolean }[];
  specs: { id: string; name: string; value: string }[];
  docs: { id: string; name: string; url: string; file_type: string }[];
}

interface ImageItem {
  key: string;
  id?: string;
  url: string;
  alt: string;
  isPrimary: boolean;
}

interface SpecItem {
  key: string;
  id?: string;
  name: string;
  value: string;
}

interface DocItem {
  key: string;
  id?: string;
  name: string;
  url: string;
  fileType: string;
}

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function moveItem<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const next = [...list];
  const target = index + delta;
  if (target < 0 || target >= next.length) return next;
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

export function ProductForm({ product, brands, categories }: { product?: FormProduct; brands: { id: string; name: string }[]; categories: { id: string; name: string }[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = Boolean(product);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      slug: product?.slug ?? "",
      brand_id: product?.brand_id ?? "",
      category_id: product?.category_id ?? "",
      short_description: product?.short_description ?? "",
      description: product?.description ?? "",
      status: product?.status ?? "draft",
      featured: product?.featured ?? false,
      seo_title: product?.seo_title ?? "",
      seo_description: product?.seo_description ?? "",
    },
  });

  const [richText, setRichText] = useState(product?.description ?? "");
  const [images, setImages] = useState<ImageItem[]>(
    (product?.images ?? []).map((im) => ({ key: uid(), id: im.id, url: im.url, alt: im.alt, isPrimary: im.is_primary }))
  );
  const [specs, setSpecs] = useState<SpecItem[]>((product?.specs ?? []).map((s) => ({ key: uid(), id: s.id, name: s.name, value: s.value })));
  const [docs, setDocs] = useState<DocItem[]>((product?.docs ?? []).map((d) => ({ key: uid(), id: d.id, name: d.name, url: d.url, fileType: d.file_type })));
  const [busy, setBusy] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [docBusy, setDocBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const onValid = async (values: ProductInput) => {
    setBusy(true);
    const payload: ProductPayload = {
      id: product?.id,
      product: {
        ...values,
        category_id: values.category_id || null,
        slug: values.slug?.trim() || undefined,
        description: richText,
      },
      images: images.map((im, i) => ({
        id: im.id,
        url: im.url,
        alt: im.alt,
        is_primary: im.isPrimary,
        display_order: i,
      })),
      specs: specs.map((s, i) => ({ id: s.id, name: s.name, value: s.value, display_order: i })),
      docs: docs.map((d, i) => ({ id: d.id, name: d.name, url: d.url, file_type: d.fileType, display_order: i })),
    };
    const result = await saveProductAction(payload);
    setBusy(false);
    if (result.ok) {
      toast(isEdit ? "Product updated." : "Product created.");
      router.push("/admin/products");
      router.refresh();
    } else {
      toast(result.error ?? "Save failed.", "error");
    }
  };

  const saveAndPublish = () => {
    setValue("status", "published");
    void handleSubmit(onValid)();
  };

  const uploadImage = async (file: File) => {
    const error = validateImageFile(file);
    if (error) {
      toast(error, "error");
      return;
    }
    setImageBusy(true);
    const uploaded = await uploadFileToStorage("productImages", file);
    if (!uploaded.ok) {
      toast(uploaded.error, "error");
      setImageBusy(false);
      return;
    }
    setImages((prev) => [...prev, { key: uid(), url: uploaded.url, alt: "", isPrimary: prev.length === 0 }]);
    setImageBusy(false);
  };

  const uploadDoc = async (file: File) => {
    const error = validateDocFile(file);
    if (error) {
      toast(error, "error");
      return;
    }
    setDocBusy(true);
    const uploaded = await uploadFileToStorage("productDocuments", file);
    if (!uploaded.ok) {
      toast(uploaded.error, "error");
      setDocBusy(false);
      return;
    }
    setDocs((prev) => [...prev, { key: uid(), name: file.name.replace(/\.pdf$/i, ""), url: uploaded.url, fileType: "pdf" }]);
    setDocBusy(false);
  };

  return (
    <form onSubmit={handleSubmit(onValid)} className="grid gap-6">
      {brands.length === 0 && (
        <Card className="p-5">
          <EmptyState
            title="No brands yet"
            description="Every product belongs to a brand. Create at least one brand (for example a technology partner of AMESL) before adding products."
            action={
              <Link href="/admin/brands/new">
                <Button variant="accent" className="text-[12px]">Create a brand first</Button>
              </Link>
            }
          />
        </Card>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <FormSection title="Basic information" description="Name, brand, category and status.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Product name" required error={errors.name?.message} className="sm:col-span-2">
                <Input placeholder="e.g. Vibration Analyzer XT-100" {...register("name")} />
              </Field>
              <Field label="Slug" hint="Leave empty to generate automatically from the name." error={errors.slug?.message}>
                <Input placeholder="auto-generated" {...register("slug")} />
              </Field>
              <Field label="Brand" required error={errors.brand_id?.message}>
                <Select {...register("brand_id")} value={watch("brand_id")}>
                  <option value="">Choose a brand…</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Category" error={errors.category_id?.message}>
                <Select {...register("category_id")} value={watch("category_id")}>
                  <option value="">No category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status" hint="Only published products are visible on the website.">
                <Select {...register("status")}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </Select>
              </Field>
              <div className="flex items-end pb-1.5">
                <Switch checked={watch("featured")} onChange={(v) => setValue("featured", v)} label="Featured on homepage showcase" />
              </div>
            </div>
          </FormSection>

          <FormSection title="Description" description="The full product description shown on the public product page.">
            <RichTextEditor value={richText} onChange={setRichText} placeholder="Describe the product, its application, key technology and benefits…" />
          </FormSection>

          <FormSection title="Short description" description="A concise summary used on product cards and search listings.">
            <Field label="Short description" error={errors.short_description?.message}>
              <Textarea maxLength={300} className="min-h-[90px]" placeholder="One or two sentences summarising the product." {...register("short_description")} />
            </Field>
            <p className="mt-1 text-right text-[11.5px] text-[#9aa6ab]">{watch("short_description")?.length ?? 0}/300</p>
          </FormSection>

          <FormSection title="Search engine optimisation" description="Optional. Defaults to the product name when left blank.">
            <div className="grid gap-4">
              <Field label="SEO title" error={errors.seo_title?.message}>
                <Input maxLength={160} placeholder="Titleshown in search results" {...register("seo_title")} />
              </Field>
              <Field label="SEO description" error={errors.seo_description?.message}>
                <Textarea maxLength={300} className="min-h-[80px]" placeholder="Meta description for search engines" {...register("seo_description")} />
              </Field>
            </div>
          </FormSection>
        </div>

        <div className="space-y-6">
          <FormSection title="Images" description="Gallery images shown on the product page.">
            <div className="flex flex-wrap gap-3">
              {images.map((img, i) => (
                <div key={img.key} className="relative w-full">
                  <div className="flex items-center gap-3 rounded-lg border border-[#e4e9ea] p-2">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-[#f2f4f3]">
                      <Image src={img.url} alt={img.alt || "Product image"} fill className="object-cover" unoptimized />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-bold text-[#8a969c]">#{i + 1}</span>
                        {img.isPrimary && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#fdf3e0] px-2 py-0.5 text-[10px] font-bold text-[#9a6b12]">
                            <Star size={10} className="fill-[#e7a42b] text-[#e7a42b]" /> Primary
                          </span>
                        )}
                        <div className="ml-auto flex items-center gap-0.5">
                          <button type="button" onClick={() => setImages(moveItem(images, i, -1))} className="rounded bg-[#e7a42b] p-1.5 text-[#172633] hover:bg-[#f3bb4e]" title="Move up">
                            <ArrowUp size={13} />
                          </button>
                          <button type="button" onClick={() => setImages(moveItem(images, i, 1))} className="rounded bg-[#e7a42b] p-1.5 text-[#172633] hover:bg-[#f3bb4e]" title="Move down">
                            <ArrowDown size={13} />
                          </button>
                          <button type="button" onClick={() => setImages(images.filter((x) => x.key !== img.key))} className="rounded bg-[#b3261e] p-1.5 text-white hover:bg-[#991b1b]" title="Remove">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input value={img.alt} onChange={(e) => setImages(images.map((x) => (x.key === img.key ? { ...x, alt: e.target.value } : x)))} placeholder="Alt text" className="h-8 text-[12px]" />
                        <button
                          type="button"
                          onClick={() => setImages(images.map((x) => ({ ...x, isPrimary: x.key === img.key })))}
                          disabled={img.isPrimary}
                          className="shrink-0 rounded-md border border-[#e7a42b] bg-[#e7a42b] px-2 py-1 text-[10px] font-bold text-[#172633] disabled:opacity-40"
                        >
                          Set primary
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadImage(f); e.target.value = ""; }} />
              <Button type="button" variant="outline" size="sm" className="text-[11px]" onClick={() => imageInputRef.current?.click()} busy={imageBusy}>
                <ImagePlus size={14} /> Upload image
              </Button>
              <Button type="button" variant="ghost" size="sm" className="text-[11px]" onClick={() => setPickerOpen(true)}>
                Browse library
              </Button>
            </div>
          </FormSection>

          <FormSection title="Documents" description="Datasheets and brochures offered as downloads.">
            <div className="space-y-2">
              {docs.map((doc) => (
                <div key={doc.key} className="flex items-center gap-2 rounded-lg border border-[#e4e9ea] px-3 py-2">
                  <FileText size={15} className="shrink-0 text-[#b3261e]" />
                  <Input
                    value={doc.name}
                    onChange={(e) => setDocs(docs.map((x) => (x.key === doc.key ? { ...x, name: e.target.value } : x)))}
                    placeholder="Document name"
                    className="h-8 flex-1 text-[12px]"
                  />
                  <button type="button" onClick={() => setDocs(docs.filter((x) => x.key !== doc.key))} className="rounded bg-[#b3261e] p-1.5 text-white hover:bg-[#991b1b]" title="Remove document">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-3">
              <input ref={docInputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadDoc(f); e.target.value = ""; }} />
              <Button type="button" variant="outline" size="sm" className="text-[11px]" onClick={() => docInputRef.current?.click()} busy={docBusy}>
                <Upload size={14} /> Upload PDF
              </Button>
            </div>
          </FormSection>

          <FormSection title="Specifications" description="Structured technical details shown as a table.">
            <div className="space-y-2">
              {specs.map((spec, i) => (
                <div key={spec.key} className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <button type="button" onClick={() => setSpecs(moveItem(specs, i, -1))} className="rounded bg-[#e7a42b] p-0.5 text-[#172633] hover:bg-[#f3bb4e]" title="Move up">
                      <ArrowUp size={12} />
                    </button>
                    <button type="button" onClick={() => setSpecs(moveItem(specs, i, 1))} className="rounded bg-[#e7a42b] p-0.5 text-[#172633] hover:bg-[#f3bb4e]" title="Move down">
                      <ArrowDown size={12} />
                    </button>
                  </div>
                  <Input
                    value={spec.name}
                    onChange={(e) => setSpecs(specs.map((x) => (x.key === spec.key ? { ...x, name: e.target.value } : x)))}
                    placeholder="Attribute"
                    className="h-9 flex-1 text-[12.5px]"
                  />
                  <Input
                    value={spec.value}
                    onChange={(e) => setSpecs(specs.map((x) => (x.key === spec.key ? { ...x, value: e.target.value } : x)))}
                    placeholder="Value"
                    className="h-9 flex-1 text-[12.5px]"
                  />
                  <button type="button" onClick={() => setSpecs(specs.filter((x) => x.key !== spec.key))} className="rounded bg-[#b3261e] p-1.5 text-white hover:bg-[#991b1b]" title="Remove specification">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <Button type="button" variant="ghost" size="sm" className="mt-2 text-[11px]" onClick={() => setSpecs([...specs, { key: uid(), name: "", value: "" }])}>
              <Plus size={14} /> Add specification
            </Button>
          </FormSection>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-6 flex flex-wrap items-center justify-end gap-2 border-t border-[#e4e9ea] bg-white/95 px-6 py-4 backdrop-blur lg:-mx-8 lg:px-8">
        <Link href="/admin/products" className="inline-flex h-10 items-center rounded-lg bg-[#e7a42b] px-4 text-[12px] font-bold text-[#172633] hover:bg-[#f3bb4e]">
          Cancel
        </Link>
        <Button type="button" variant="outline" className="text-[12px]" onClick={saveAndPublish} disabled={busy}>
          Save & publish
        </Button>
        <Button type="submit" className="text-[12px]" busy={busy}>
          {isEdit ? "Save changes" : "Create product"}
        </Button>
      </div>

      <MediaPicker open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={(url) => setImages((prev) => [...prev, { key: uid(), url, alt: "", isPrimary: prev.length === 0 }])} />
    </form>
  );
}
