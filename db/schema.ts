import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () => timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow();

export const profiles = pgTable("profiles", {
  id: id(),
  email: text("email").notNull(),
  password_hash: text("password_hash").notNull().default(""),
  full_name: text("full_name").notNull().default(""),
  role: text("role").notNull().default("sales"),
  is_deleted: boolean("is_deleted").notNull().default(false),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [uniqueIndex("profiles_email_idx").on(t.email)]);

export const brands = pgTable("brands", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull().default(""),
  logo_url: text("logo_url").notNull().default(""),
  website: text("website").notNull().default(""),
  status: text("status").notNull().default("active"),
  display_order: integer("display_order").notNull().default(0),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [uniqueIndex("brands_slug_idx").on(t.slug)]);

export const categories = pgTable("categories", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("active"),
  display_order: integer("display_order").notNull().default(0),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [uniqueIndex("categories_slug_idx").on(t.slug)]);

export const products = pgTable("products", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  brand_id: uuid("brand_id").notNull(),
  category_id: uuid("category_id"),
  short_description: text("short_description").notNull().default(""),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("draft"),
  featured: boolean("featured").notNull().default(false),
  seo_title: text("seo_title").notNull().default(""),
  seo_description: text("seo_description").notNull().default(""),
  created_by: uuid("created_by"),
  updated_by: uuid("updated_by"),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [
  uniqueIndex("products_slug_idx").on(t.slug),
  index("products_brand_id_idx").on(t.brand_id),
  index("products_category_id_idx").on(t.category_id),
  index("products_status_idx").on(t.status),
  index("products_featured_idx").on(t.featured),
  index("products_created_at_idx").on(t.created_at),
]);

export const productImages = pgTable("product_images", {
  id: id(),
  product_id: uuid("product_id").notNull(),
  url: text("url").notNull(),
  alt: text("alt").notNull().default(""),
  is_primary: boolean("is_primary").notNull().default(false),
  display_order: integer("display_order").notNull().default(0),
  created_at: createdAt(),
}, (t) => [index("product_images_product_id_idx").on(t.product_id)]);

export const productSpecifications = pgTable("product_specifications", {
  id: id(),
  product_id: uuid("product_id").notNull(),
  name: text("name").notNull(),
  value: text("value").notNull(),
  display_order: integer("display_order").notNull().default(0),
}, (t) => [index("product_specifications_product_id_idx").on(t.product_id)]);

export const productDocuments = pgTable("product_documents", {
  id: id(),
  product_id: uuid("product_id").notNull(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  file_type: text("file_type").notNull().default("pdf"),
  display_order: integer("display_order").notNull().default(0),
  created_at: createdAt(),
}, (t) => [index("product_documents_product_id_idx").on(t.product_id)]);

export const productLabels = pgTable("product_labels", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  /** Optional copy for the filter control and the admin list. */
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("active"),
  display_order: integer("display_order").notNull().default(0),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [
  uniqueIndex("product_labels_slug_idx").on(t.slug),
  index("product_labels_status_idx").on(t.status, t.display_order),
]);

/**
 * Join table for many-to-many product labelling. A composite primary key makes
 * the same label impossible to attach twice, and both sides cascade on delete so
 * a removed product or retired-then-deleted label leaves no orphan rows.
 */
export const productLabelAssignments = pgTable("product_label_assignments", {
  product_id: uuid("product_id").notNull(),
  label_id: uuid("label_id").notNull(),
  display_order: integer("display_order").notNull().default(0),
}, (t) => [
  primaryKey({ columns: [t.product_id, t.label_id] }),
  index("product_label_assignments_label_id_idx").on(t.label_id),
]);

export const quoteRequests = pgTable("quote_requests", {
  id: id(),
  product_id: uuid("product_id"),
  product_name: text("product_name").notNull().default(""),
  brand_name: text("brand_name").notNull().default(""),
  customer_name: text("customer_name").notNull(),
  customer_email: text("customer_email").notNull(),
  customer_phone: text("customer_phone").notNull().default(""),
  company_name: text("company_name").notNull().default(""),
  message: text("message").notNull().default(""),
  quantity: integer("quantity").notNull().default(1),
  status: text("status").notNull().default("new"),
  internal_notes: text("internal_notes").notNull().default(""),
  archived: boolean("archived").notNull().default(false),
  /** Salted hash of the submitting client, used for cross-instance rate limiting. */
  submitter_hash: text("submitter_hash"),
  created_at: createdAt(),
}, (t) => [
  index("quote_requests_status_idx").on(t.status),
  index("quote_requests_created_at_idx").on(t.created_at),
  index("quote_requests_submitter_hash_idx").on(t.submitter_hash),
]);

export const heroSlides = pgTable("hero_slides", {
  id: id(),
  image_desktop: text("image_desktop").notNull().default(""),
  image_mobile: text("image_mobile").notNull().default(""),
  headline: text("headline").notNull().default(""),
  subtext: text("subtext").notNull().default(""),
  cta_label: text("cta_label").notNull().default(""),
  cta_href: text("cta_href").notNull().default(""),
  status: text("status").notNull().default("active"),
  display_order: integer("display_order").notNull().default(0),
  created_at: createdAt(),
  updated_at: updatedAt(),
});

export const homepageFeaturedProducts = pgTable("homepage_featured_products", {
  id: id(),
  product_id: uuid("product_id").notNull(),
  display_order: integer("display_order").notNull().default(0),
  created_at: createdAt(),
}, (t) => [uniqueIndex("homepage_featured_products_product_id_idx").on(t.product_id)]);

export const media = pgTable("media", {
  id: id(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  file_type: text("file_type").notNull().default(""),
  size_bytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),
  width: integer("width"),
  height: integer("height"),
  uploaded_by: uuid("uploaded_by"),
  created_at: createdAt(),
});

export const siteSettings = pgTable("site_settings", {
  key: text("key").notNull(),
  value: text("value").notNull().default(""),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [primaryKey({ columns: [t.key] })]);

export const newsCategories = pgTable("news_categories", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("active"),
  display_order: integer("display_order").notNull().default(0),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [
  uniqueIndex("news_categories_slug_idx").on(t.slug),
  index("news_categories_status_idx").on(t.status),
]);

export const newsPosts = pgTable("news_posts", {
  id: id(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  excerpt: text("excerpt").notNull().default(""),
  body: text("body").notNull().default(""),
  cover_image: text("cover_image").notNull().default(""),
  cover_image_alt: text("cover_image_alt").notNull().default(""),
  category_id: uuid("category_id"),
  status: text("status").notNull().default("draft"),
  featured: boolean("featured").notNull().default(false),
  /** Null publishes as soon as status flips to published; a future value holds the post back. */
  publish_at: timestamp("publish_at", { withTimezone: true, mode: "string" }),
  seo_title: text("seo_title").notNull().default(""),
  seo_description: text("seo_description").notNull().default(""),
  /**
   * Per-article opt-in for the public comment thread. False by default so an
   * article predating the feature stays closed, and re-checked server-side by
   * the submit action rather than trusted from the rendered form.
   */
  allow_comments: boolean("allow_comments").notNull().default(false),
  created_by: uuid("created_by"),
  updated_by: uuid("updated_by"),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [
  uniqueIndex("news_posts_slug_idx").on(t.slug),
  index("news_posts_status_idx").on(t.status),
  index("news_posts_category_id_idx").on(t.category_id),
  index("news_posts_featured_idx").on(t.featured),
  index("news_posts_created_at_idx").on(t.created_at),
  // Mirrors the partial index in sql/schema.sql; serves the public listing.
  index("news_posts_published_idx").on(t.publish_at, t.created_at),
]);

/**
 * Public comments on a news article. The only user-generated content on the
 * site besides quote requests, and the only one with no identity behind it:
 * `author_name` is self-declared and `author_email` is stored for moderation
 * only, neither ever rendered on a public page.
 */
export const postComments = pgTable("post_comments", {
  id: id(),
  post_id: uuid("post_id").notNull(),
  author_name: text("author_name").notNull(),
  /** Never rendered publicly. Held so an editor can contact the author. */
  author_email: text("author_email").notNull(),
  /** Plain text, sanitised on write. Never rendered as HTML. */
  body: text("body").notNull(),
  /**
   * 'published' on insert, because a comment appears immediately by decision.
   * 'hidden' lets an editor take one down and put it back; hard delete stays
   * available for spam.
   */
  status: text("status").notNull().default("published"),
  /** Salted hash of the submitting client, used for cross-instance rate limiting. */
  submitter_hash: text("submitter_hash").notNull().default(""),
  created_at: createdAt(),
}, (t) => [
  // Serves the public read path: one post, published only, oldest first.
  index("post_comments_post_id_idx").on(t.post_id, t.created_at),
  index("post_comments_submitter_hash_idx").on(t.submitter_hash, t.created_at),
  index("post_comments_created_at_idx").on(t.created_at),
]);

export const services = pgTable("services", {
  id: id(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  /** One-line card copy on /services and the homepage band. */
  summary: text("summary").notNull().default(""),
  /**
   * A key into the curated map in lib/service-icons.ts, never a name of an SVG
   * component. The value is admin-editable, so it is validated against
   * SERVICE_ICON_KEYS in the write path and falls back to a default on read.
   */
  icon: text("icon").notNull().default("activity"),
  /**
   * The entire body of a service page, as rich-text HTML authored in the admin.
   * Sanitised against an allowlist in the server action before it is written (see
   * lib/sanitize.ts) and re-sanitised on read. Headings, lists and paragraphs are
   * all on the allowlist, so subheadings and bulleted lists inside the overview
   * are supported.
   */
  overview: text("overview").notNull().default(""),
  image: text("image").notNull().default(""),
  image_alt: text("image_alt").notNull().default(""),
  /**
   * active/inactive rather than news' draft/published/archived: a service page
   * is either offered or not. There is nothing to schedule, so there is no
   * publish_at column.
   */
  status: text("status").notNull().default("active"),
  display_order: integer("display_order").notNull().default(0),
  seo_title: text("seo_title").notNull().default(""),
  seo_description: text("seo_description").notNull().default(""),
  created_by: uuid("created_by"),
  updated_by: uuid("updated_by"),
  created_at: createdAt(),
  updated_at: updatedAt(),
}, (t) => [
  uniqueIndex("services_slug_idx").on(t.slug),
  // Serves both public reads: the ordered /services grid and the homepage band.
  index("services_status_idx").on(t.status, t.display_order),
]);

export const auditLogs = pgTable("audit_logs", {
  id: id(),
  user_id: uuid("user_id"),
  user_email: text("user_email").notNull().default(""),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resource_id: text("resource_id").notNull().default(""),
  details: jsonb("details").notNull().default({}),
  created_at: createdAt(),
}, (t) => [index("audit_logs_created_at_idx").on(t.created_at)]);

export const brandsRelations = relations(brands, ({ many }) => ({ products: many(products) }));
export const categoriesRelations = relations(categories, ({ many }) => ({ products: many(products) }));

export const productsRelations = relations(products, ({ one, many }) => ({
  brand: one(brands, { fields: [products.brand_id], references: [brands.id] }),
  category: one(categories, { fields: [products.category_id], references: [categories.id] }),
  images: many(productImages),
  specifications: many(productSpecifications),
  documents: many(productDocuments),
  labelAssignments: many(productLabelAssignments),
}));

export const productLabelsRelations = relations(productLabels, ({ many }) => ({
  assignments: many(productLabelAssignments),
}));

export const productLabelAssignmentsRelations = relations(productLabelAssignments, ({ one }) => ({
  product: one(products, { fields: [productLabelAssignments.product_id], references: [products.id] }),
  label: one(productLabels, { fields: [productLabelAssignments.label_id], references: [productLabels.id] }),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
  product: one(products, { fields: [productImages.product_id], references: [products.id] }),
}));

export const productSpecificationsRelations = relations(productSpecifications, ({ one }) => ({
  product: one(products, { fields: [productSpecifications.product_id], references: [products.id] }),
}));

export const productDocumentsRelations = relations(productDocuments, ({ one }) => ({
  product: one(products, { fields: [productDocuments.product_id], references: [products.id] }),
}));

export const homepageFeaturedProductsRelations = relations(homepageFeaturedProducts, ({ one }) => ({
  product: one(products, { fields: [homepageFeaturedProducts.product_id], references: [products.id] }),
}));

export const newsCategoriesRelations = relations(newsCategories, ({ many }) => ({
  posts: many(newsPosts),
}));

export const newsPostsRelations = relations(newsPosts, ({ one, many }) => ({
  category: one(newsCategories, { fields: [newsPosts.category_id], references: [newsCategories.id] }),
  comments: many(postComments),
}));

export const postCommentsRelations = relations(postComments, ({ one }) => ({
  post: one(newsPosts, { fields: [postComments.post_id], references: [newsPosts.id] }),
}));

export type ProfileRow = typeof profiles.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type BrandRow = typeof brands.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;
export type ProductLabelRow = typeof productLabels.$inferSelect;
export type QuoteRequestRow = typeof quoteRequests.$inferSelect;
export type HeroSlideRow = typeof heroSlides.$inferSelect;
export type MediaRow = typeof media.$inferSelect;
export type NewsPostRow = typeof newsPosts.$inferSelect;
export type NewsCategoryRow = typeof newsCategories.$inferSelect;
export type ServiceRow = typeof services.$inferSelect;
export type PostCommentRow = typeof postComments.$inferSelect;