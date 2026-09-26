import { z } from "zod";

export const optionalString = z.string().default("");

export const productSchema = z.object({
  name: z.string().trim().min(2, "Product name is required").max(160),
  slug: z.string().trim().max(200).optional(),
  brand_id: z.string().min(1, "Please choose a brand"),
  category_id: z.string().nullable().optional(),
  short_description: z.string().trim().max(300).optional(),
  description: z.string().max(100_000).optional(),
  status: z.enum(["draft", "published", "archived"]),
  featured: z.boolean(),
  seo_title: z.string().trim().max(160).optional(),
  seo_description: z.string().trim().max(300).optional(),
});

export type ProductInput = z.infer<typeof productSchema>;

export const brandSchema = z.object({
  name: z.string().trim().min(2, "Brand name is required").max(120),
  slug: z.string().trim().max(150).optional(),
  description: z.string().trim().max(2000).optional(),
  website: z.url("Enter a valid URL").or(z.literal("")).optional(),
  logo_url: z.string().optional(),
  status: z.enum(["active", "inactive"]),
  display_order: z.coerce.number().int().min(0).max(9999).default(0),
});

export type BrandInput = z.infer<typeof brandSchema>;

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Category name is required").max(120),
  slug: z.string().trim().max(150).optional(),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(["active", "inactive"]),
  display_order: z.coerce.number().int().min(0).max(9999).default(0),
});

export type CategoryInput = z.infer<typeof categorySchema>;

export const quoteSchema = z.object({
  product_id: z.string().optional().nullable(),
  product_name: z.string().default(""),
  brand_name: z.string().default(""),
  customer_name: z.string().trim().min(2, "Your name is required").max(120),
  customer_email: z.email("Enter a valid email").max(160),
  customer_phone: z.string().trim().max(40).optional(),
  company_name: z.string().trim().max(160).optional(),
  message: z.string().trim().max(2000).optional(),
  quantity: z.coerce.number().int().min(1).max(100000).default(1),
  /** Honeypot — hidden from people, appealing to bots. Must arrive empty. */
  website: z.string().max(200).optional(),
  /** Client clock when the form was shown, used to reject instant submissions. */
  started_at: z.coerce.number().int().nonnegative().optional(),
});

export type QuoteInput = z.infer<typeof quoteSchema>;

/** Submissions closer together than this are treated as automated. */
export const QUOTE_MIN_FILL_MS = 2500;
/** Ceiling on a form session, so a stale tab cannot bypass the timing check. */
export const QUOTE_MAX_FILL_MS = 6 * 60 * 60 * 1000;

export const heroSlideSchema = z.object({
  headline: z.string().trim().min(2, "Headline is required").max(160),
  subtext: z.string().trim().max(600).optional(),
  image_desktop: z.string().min(1, "Desktop image is required"),
  image_mobile: z.string().optional(),
  cta_label: z.string().trim().max(60).optional(),
  cta_href: z.string().trim().max(300).optional(),
  status: z.enum(["active", "inactive"]),
  display_order: z.coerce.number().int().min(0).max(9999).default(0),
});

export type HeroSlideInput = z.infer<typeof heroSlideSchema>;

export const newsCategorySchema = z.object({
  name: z.string().trim().min(2, "Category name is required").max(120),
  slug: z.string().trim().max(150).optional(),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(["active", "inactive"]),
  display_order: z.coerce.number().int().min(0).max(9999).default(0),
});

export type NewsCategoryInput = z.infer<typeof newsCategorySchema>;

export const NEWS_STATUSES = ["draft", "published", "archived"] as const;

/**
 * `datetime-local` inputs submit "2026-04-01T09:30" in the *admin's* local
 * time with no zone. Converting on the client and re-parsing an ISO instant here
 * would silently shift the scheduled instant for anyone outside UTC, so the raw
 * local string is parsed here and only the resulting Date is serialised.
 */
const localDateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, "Use the date and time picker")
  .refine((value) => !Number.isNaN(new Date(value).getTime()), "That date is not a real date");

export const newsPostSchema = z.object({
  title: z.string().trim().min(2, "Title is required").max(200),
  slug: z.string().trim().max(200).optional(),
  excerpt: z.string().trim().max(400).optional(),
  body: z.string().max(400_000).optional(),
  cover_image: z.string().trim().max(500).optional(),
  cover_image_alt: z.string().trim().max(200).optional(),
  category_id: z.string().nullable().optional(),
  status: z.enum(NEWS_STATUSES),
  // Required rather than defaulted, matching productSchema: the form supplies it
  // via defaultValues, and a schema-level default splits the resolver's input
  // and output types.
  featured: z.boolean(),
  publish_at: z.union([localDateString, z.literal("")]).optional(),
  seo_title: z.string().trim().max(200).optional(),
  seo_description: z.string().trim().max(400).optional(),
});

export type NewsPostInput = z.infer<typeof newsPostSchema>;

/** Google renders ~60 characters of a title and ~160 of a description. */
export const SEO_TITLE_MAX = 60;
export const SEO_DESCRIPTION_MAX = 160;

export const roleSchema = z.enum(["super_admin", "product_manager", "content_manager", "sales"]);

export const settingsSchema = z.record(z.string(), z.string().max(500));

export const idsSchema = z.object({ ids: z.array(z.string()).min(1, "Select at least one item") });