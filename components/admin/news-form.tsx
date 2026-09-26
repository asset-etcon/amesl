"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Rocket, Upload, X } from "lucide-react";
import { Button, Card, Field, FormSection, Input, Select, Switch, Textarea, useToast } from "@/components/admin/ui";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { uploadFileToStorage } from "@/lib/client-upload";
import { validateImageFile } from "@/lib/media";
import { saveNewsPostAction } from "@/app/admin/(dashboard)/news/actions";
import { newsPostSchema, SEO_DESCRIPTION_MAX, SEO_TITLE_MAX, type NewsPostInput } from "@/lib/validators";
import { NEWS_STATUS_DESCRIPTIONS, NEWS_STATUS_LABELS, type NewsStatus } from "@/lib/types";

export interface NewsFormPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  cover_image: string;
  cover_image_alt: string;
  category_id: string | null;
  status: NewsStatus;
  featured: boolean;
  publish_at: string | null;
  seo_title: string;
  seo_description: string;
}

export interface NewsFormCategory {
  id: string;
  name: string;
}

/** `datetime-local` needs "YYYY-MM-DDTHH:mm" in the browser's own timezone. */
function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function NewsForm({ post, categories }: { post?: NewsFormPost; categories: NewsFormCategory[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const isEdit = Boolean(post);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState(post?.body ?? "");
  const [cover, setCover] = useState(post?.cover_image ?? "");
  const [coverBusy, setCoverBusy] = useState(false);
  const [busy, setBusy] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NewsPostInput>({
    resolver: zodResolver(newsPostSchema),
    defaultValues: {
      title: post?.title ?? "",
      slug: post?.slug ?? "",
      excerpt: post?.excerpt ?? "",
      category_id: post?.category_id ?? "",
      status: post?.status ?? "draft",
      featured: post?.featured ?? false,
      publish_at: toLocalInputValue(post?.publish_at ?? null),
      seo_title: post?.seo_title ?? "",
      seo_description: post?.seo_description ?? "",
      body: post?.body ?? "",
    },
  });

  const status = watch("status");
  const publishAt = watch("publish_at");
  const seoTitle = watch("seo_title") ?? "";
  const seoDescription = watch("seo_description") ?? "";

  const onValid = async (values: NewsPostInput) => {
    setBusy(true);
    // The picker yields a wall-clock string with no offset. Resolve it to a real
    // instant here, in the browser, because the server cannot know the admin's
    // timezone: read as UTC it would shift every scheduled time by their offset,
    // and "Publish now" would leave the article hidden until that shift elapsed.
    let publishAtIso: string | undefined;
    if (values.publish_at) {
      const instant = new Date(values.publish_at as string);
      if (!Number.isNaN(instant.getTime())) publishAtIso = instant.toISOString();
    }

    const result = await saveNewsPostAction({
      id: post?.id,
      title: values.title,
      slug: values.slug?.trim() || undefined,
      excerpt: values.excerpt,
      body,
      cover_image: cover,
      cover_image_alt: values.cover_image_alt ?? "",
      category_id: values.category_id || null,
      status: values.status,
      featured: values.featured ?? false,
      publish_at: publishAtIso,
      seo_title: values.seo_title,
      seo_description: values.seo_description,
    });
    setBusy(false);
    if (result.ok) {
      toast(isEdit ? "Article updated." : "Article created.");
      router.push("/admin/news");
      router.refresh();
    } else {
      toast(result.error ?? "Save failed.", "error");
    }
  };

  const uploadCover = async (file: File) => {
    const error = validateImageFile(file);
    if (error) {
      toast(error, "error");
      return;
    }
    setCoverBusy(true);
    const uploaded = await uploadFileToStorage("newsImages", file);
    setCoverBusy(false);
    if (!uploaded.ok) {
      toast(uploaded.error, "error");
      return;
    }
    setCover(uploaded.url);
  };

  const saveAndPublish = () => {
    setValue("status", "published");
    void handleSubmit(onValid)();
  };

  /**
   * Publishes whatever is on screen, immediately.
   *
   * Goes through the normal submit path rather than calling a server action with
   * just an id, because the editor may have unsaved changes and dropping them
   * without warning would be the worst possible outcome of a button labelled
   * "Publish". The current local minute is written into the picker and the usual
   * browser-side conversion turns it into a real instant, so any future schedule
   * is discarded -- which is the entire point of the button.
   */
  const publishNow = () => {
    setValue("status", "published");
    setValue("publish_at", toLocalInputValue(new Date().toISOString()));
    void handleSubmit(onValid)();
  };

  // A pending future schedule is the one case where "Save & publish" would lie:
  // it sets status=published but leaves the date alone, so the article stays
  // hidden until then. "Publish now" replaces it there, and only there. A post
  // that is already live and unscheduled needs neither button.
  const scheduledInstant = publishAt ? new Date(publishAt).getTime() : Number.NaN;
  const hasFutureSchedule = !Number.isNaN(scheduledInstant) && scheduledInstant > Date.now();
  const showPublishNow = hasFutureSchedule || status === "published";
  const showSaveAndPublish = !hasFutureSchedule && status !== "published";

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-5">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push("/admin/news")}
          className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#5d6b73] hover:text-[#152431]"
        >
          <ArrowLeft size={15} /> Back to news
        </button>
      </div>

      <Card className="p-5">
        <FormSection title="Article" description="The title, summary and body shown on the public article page.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" required error={errors.title?.message} className="sm:col-span-2">
              <Input {...register("title")} placeholder="e.g. New vibration monitoring partnership" />
            </Field>

            <Field label="Slug" hint="Leave empty to generate from the title." error={errors.slug?.message}>
              <Input {...register("slug")} placeholder="auto-generated" />
            </Field>

            <Field label="Category" error={errors.category_id?.message}>
              <Select {...register("category_id")}>
                <option value="">Uncategorised</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Excerpt"
              hint="Shown in listings and used as the meta description fallback. Plain text."
              error={errors.excerpt?.message}
              className="sm:col-span-2"
            >
              <Textarea rows={3} {...register("excerpt")} placeholder="One or two sentences summarising the article." />
            </Field>
          </div>

          <div className="mt-4">
            <Field
              label="Body"
              hint="Rich text. Scripts, embedded frames and unsafe links are stripped when you save."
              error={errors.body?.message}
            >
              <RichTextEditor value={body} onChange={setBody} placeholder="Write the article…" />
            </Field>
          </div>
        </FormSection>
      </Card>

      <Card className="p-5">
        <FormSection title="Cover image" description="Used on the article page, the social card and Open Graph tags.">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadCover(file);
              e.target.value = "";
            }}
          />
          {cover ? (
            <div className="flex items-start gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cover} alt="" className="h-28 w-44 rounded-lg border border-[#e4e9ea] object-cover" />
              <div className="flex flex-col gap-2">
                <Button type="button" variant="outline" busy={coverBusy} onClick={() => fileInputRef.current?.click()}>
                  <Upload size={15} /> Replace
                </Button>
                <Button type="button" variant="ghost" onClick={() => setCover("")}>
                  <X size={15} /> Remove
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" busy={coverBusy} onClick={() => fileInputRef.current?.click()}>
              <Upload size={15} /> Upload cover image
            </Button>
          )}

          <div className="mt-4">
            <Field
              label="Cover image alt text"
              hint="Describe the image for screen readers and image search. Leave empty to use the article title."
              error={errors.cover_image_alt?.message}
            >
              <Input {...register("cover_image_alt")} placeholder="Technician taking vibration readings on a motor" />
            </Field>
          </div>
        </FormSection>
      </Card>

      <Card className="p-5">
        <FormSection title="Publishing" description="Control when and how this article appears on the public site.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status" hint={NEWS_STATUS_DESCRIPTIONS[status as NewsStatus] ?? ""}>
              <Select {...register("status")}>
                {(["draft", "published", "archived"] as const).map((value) => (
                  <option key={value} value={value}>
                    {NEWS_STATUS_LABELS[value]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Publish date"
              hint={
                publishAt
                  ? "The article appears automatically at this time."
                  : "Leave empty to publish as soon as the status is set to Published."
              }
              error={errors.publish_at?.message}
            >
              <Input type="datetime-local" {...register("publish_at")} />
            </Field>
          </div>

          <div className="mt-4">
            <Switch
              checked={watch("featured") ?? false}
              onChange={(v) => setValue("featured", v)}
              label="Feature this article"
            />
          </div>
        </FormSection>
      </Card>

      <Card className="p-5">
        <FormSection
          title="Search engine listing"
          description="Leave empty to fall back to the title and excerpt. Google truncates around 60 characters for a title and 160 for a description."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="SEO title"
              hint={`${seoTitle.length}/${SEO_TITLE_MAX}`}
              error={errors.seo_title?.message}
            >
              <Input {...register("seo_title")} maxLength={SEO_TITLE_MAX} placeholder="Defaults to the article title" />
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
                placeholder="Defaults to the excerpt"
              />
            </Field>
          </div>
        </FormSection>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-2 pb-4">
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/news")}>
          Cancel
        </Button>
        {showSaveAndPublish ? (
          <Button type="button" variant="outline" busy={busy} onClick={saveAndPublish}>
            Save &amp; publish
          </Button>
        ) : null}
        {showPublishNow ? (
          <Button
            type="button"
            variant={hasFutureSchedule ? "accent" : "outline"}
            busy={busy}
            onClick={publishNow}
            title={
              hasFutureSchedule
                ? "Publish immediately and discard the scheduled date"
                : "Set the publication date to now and make the article live"
            }
          >
            <Rocket size={15} />
            Publish now
          </Button>
        ) : null}
        <Button type="submit" busy={busy}>
          {isEdit ? "Save changes" : "Create article"}
        </Button>
      </div>
    </form>
  );
}
