"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Upload, X } from "lucide-react";
import { Button, Card, Field, FormSection, Input, Select, Textarea, useToast } from "@/components/admin/ui";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { ServiceIcon } from "@/components/public/service-icon";
import { uploadFileToStorage } from "@/lib/client-upload";
import { validateImageFile } from "@/lib/media";
import { saveServiceAction } from "@/app/admin/(dashboard)/services/actions";
import { serviceSchema, SEO_DESCRIPTION_MAX, SEO_TITLE_MAX, type ServiceInput } from "@/lib/validators";
import { SERVICE_ICON_KEYS, type ServiceIconKey } from "@/lib/service-icons";

export interface ServiceFormService {
  id: string;
  name: string;
  slug: string;
  summary: string;
  icon: string;
  overview: string;
  scope: string;
  method: string;
  deliverables: string;
  image: string;
  image_alt: string;
  status: "active" | "inactive";
  display_order: number;
  seo_title: string;
  seo_description: string;
}

/** Human labels for the icon keys, so the picker reads as a set of choices. */
const ICON_LABELS: Record<ServiceIconKey, string> = {
  motor: "Electric motor",
  thermometer: "Thermography / heat",
  ultrasound: "Ultrasound",
  crosshair: "Alignment / target",
  scanline: "Scan / detection",
  balance: "Balancing / rotation",
  waves: "Vibration / signal",
  sliders: "Calibration / adjustment",
  wrench: "Equipment / tooling",
  zap: "Electrical power",
  activity: "Condition monitoring",
  gauge: "Measurement / meter",
  shield: "Inspection / safety",
};

const STATUS_DESCRIPTIONS: Record<ServiceFormService["status"], string> = {
  active: "Listed on /services and reachable at its own page.",
  inactive: "Hidden from the public site but kept in the admin.",
};

export function ServiceForm({ service }: { service?: ServiceFormService }) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = Boolean(service);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // The three rich-text blocks are local state, not react-hook-form fields: the
  // editors are fully controlled by `value`/`onChange`, so registering them
  // would only duplicate the same value in two places.
  const [overview, setOverview] = useState(service?.overview ?? "");
  const [scope, setScope] = useState(service?.scope ?? "");
  const [method, setMethod] = useState(service?.method ?? "");
  const [deliverables, setDeliverables] = useState(service?.deliverables ?? "");
  const [image, setImage] = useState(service?.image ?? "");
  const [imageBusy, setImageBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<
    z.input<typeof serviceSchema>,
    unknown,
    z.output<typeof serviceSchema>
  >({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: service?.name ?? "",
      slug: service?.slug ?? "",
      summary: service?.summary ?? "",
      icon: (service?.icon as ServiceIconKey) ?? "activity",
      image: service?.image ?? "",
      image_alt: service?.image_alt ?? "",
      status: service?.status ?? "active",
      display_order: service?.display_order ?? 0,
      seo_title: service?.seo_title ?? "",
      seo_description: service?.seo_description ?? "",
    },
  });

  const status = watch("status");
  const icon = watch("icon");
  const seoTitle = watch("seo_title") ?? "";
  const seoDescription = watch("seo_description") ?? "";

  const onValid = async (values: ServiceInput) => {
    setBusy(true);
    const result = await saveServiceAction({
      id: service?.id,
      name: values.name,
      slug: values.slug?.trim() || undefined,
      summary: values.summary,
      icon: values.icon,
      overview,
      scope,
      method,
      deliverables,
      image,
      image_alt: values.image_alt ?? "",
      status: values.status,
      display_order: values.display_order,
      seo_title: values.seo_title,
      seo_description: values.seo_description,
    });
    setBusy(false);
    if (result.ok) {
      toast(isEdit ? "Service updated." : "Service created.");
      router.push("/admin/services");
      router.refresh();
    } else {
      toast(result.error ?? "Save failed.", "error");
    }
  };

  const uploadImage = async (file: File) => {
    const error = validateImageFile(file);
    if (error) {
      toast(error, "error");
      return;
    }
    setImageBusy(true);
    const uploaded = await uploadFileToStorage("servicesImages", file);
    setImageBusy(false);
    if (!uploaded.ok) {
      toast(uploaded.error, "error");
      return;
    }
    setImage(uploaded.url);
  };

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/admin/services")}
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#5d6b73] hover:text-[#152431]"
        >
          <ArrowLeft size={15} /> Back to services
        </button>
      </div>

      <Card className="p-5">
        <FormSection title="Service" description="The name, summary and card icon shown across the public website.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required error={errors.name?.message} className="sm:col-span-2">
              <Input {...register("name")} placeholder="e.g. Vibration Analysis" />
            </Field>

            <Field label="Slug" hint="Leave empty to generate from the name." error={errors.slug?.message}>
              <Input {...register("slug")} placeholder="auto-generated" />
            </Field>

            <Field
              label="Icon"
              hint="Shown on the card and at the top of the service page."
              error={errors.icon?.message}
            >
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f4f1e9] text-[#aa761e]">
                  <ServiceIcon name={icon} size={17} />
                </span>
                <Select {...register("icon")}>
                  {SERVICE_ICON_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {ICON_LABELS[key]}
                    </option>
                  ))}
                </Select>
              </div>
            </Field>

            <Field
              label="Summary"
              hint="One or two sentences, used on the card and as the meta description fallback. Plain text."
              error={errors.summary?.message}
              className="sm:col-span-2"
            >
              <Textarea
                rows={3}
                {...register("summary")}
                placeholder="Identify rotating machinery faults and track how machine condition is changing."
              />
            </Field>
          </div>
        </FormSection>
      </Card>

      <Card className="p-5">
        <FormSection
          title="Page content"
          description="What the visitor reads on the service page. Scripts, embedded frames and unsafe links are stripped when you save."
        >
          <div className="space-y-5">
            <Field
              label="Overview"
              hint="Opening paragraphs: what the service is and why an operator needs it."
              error={errors.overview?.message}
            >
              <RichTextEditor value={overview} onChange={setOverview} placeholder="What this service covers…" />
            </Field>

            <Field
              label="What we cover"
              hint="A bulleted list of the equipment, tests or measurements included."
              error={errors.scope?.message}
            >
              <RichTextEditor value={scope} onChange={setScope} placeholder="List what is included in the survey…" />
            </Field>

            <Field
              label="How we deliver it"
              hint="The steps of the work, in order. Use the numbered-list button for a sequence."
              error={errors.method?.message}
            >
              <RichTextEditor value={method} onChange={setMethod} placeholder="How the work is carried out…" />
            </Field>

            <Field
              label="What you receive"
              hint="The report contents and any follow-up you can expect."
              error={errors.deliverables?.message}
            >
              <RichTextEditor
                value={deliverables}
                onChange={setDeliverables}
                placeholder="Deliverables and reporting…"
              />
            </Field>
          </div>
        </FormSection>
      </Card>

      <Card className="p-5">
        <FormSection title="Image" description="Optional. Used on the service page and in social preview cards.">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadImage(file);
              e.target.value = "";
            }}
          />
          {image ? (
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="" className="h-28 w-44 rounded-lg border border-[#e4e9ea] object-cover" />
              <div className="flex flex-col gap-2">
                <Button type="button" variant="outline" busy={imageBusy} onClick={() => fileInputRef.current?.click()}>
                  <Upload size={15} /> Replace
                </Button>
                <Button type="button" variant="ghost" onClick={() => setImage("")}>
                  <X size={15} /> Remove
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" busy={imageBusy} onClick={() => fileInputRef.current?.click()}>
              <Upload size={15} /> Upload image
            </Button>
          )}

          <div className="mt-4">
            <Field
              label="Image alt text"
              hint="Describe the image for screen readers and image search. Leave empty if the image is decorative."
              error={errors.image_alt?.message}
            >
              <Input {...register("image_alt")} placeholder="Engineer taking vibration readings on a motor" />
            </Field>
          </div>
        </FormSection>
      </Card>

      <Card className="p-5">
        <FormSection title="Visibility" description="Where this service appears, and where it sits in the grid.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status" hint={STATUS_DESCRIPTIONS[status] ?? ""} error={errors.status?.message}>
              <Select {...register("status")}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>

            <Field
              label="Order"
              hint="Lower numbers appear first. Ties fall back to alphabetical order."
              error={errors.display_order?.message}
            >
              <Input type="number" min={0} max={9999} {...register("display_order")} />
            </Field>
          </div>
        </FormSection>
      </Card>

      <Card className="p-5">
        <FormSection
          title="Search engine listing"
          description="Leave empty to fall back to the name and summary. Google truncates around 60 characters for a title and 160 for a description."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SEO title" hint={`${seoTitle.length}/${SEO_TITLE_MAX}`} error={errors.seo_title?.message}>
              <Input {...register("seo_title")} maxLength={SEO_TITLE_MAX} placeholder="Defaults to the service name" />
            </Field>

            <Field
              label="Meta description"
              hint={`${seoDescription.length}/${SEO_DESCRIPTION_MAX}`}
              error={errors.seo_description?.message}
            >
              <Textarea
                rows={2}
                {...register("seo_description")}
                maxLength={SEO_DESCRIPTION_MAX}
                placeholder="Defaults to the summary"
              />
            </Field>
          </div>
        </FormSection>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-2 pb-4">
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/services")}>
          Cancel
        </Button>
        <Button type="submit" busy={busy}>
          {isEdit ? "Save changes" : "Create service"}
        </Button>
      </div>
    </form>
  );
}
