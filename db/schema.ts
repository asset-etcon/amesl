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
  created_at: createdAt(),
}, (t) => [
  index("quote_requests_status_idx").on(t.status),
  index("quote_requests_created_at_idx").on(t.created_at),
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

export type ProfileRow = typeof profiles.$inferSelect;
export type ProductRow = typeof products.$inferSelect;
export type BrandRow = typeof brands.$inferSelect;
export type CategoryRow = typeof categories.$inferSelect;
export type QuoteRequestRow = typeof quoteRequests.$inferSelect;
export type HeroSlideRow = typeof heroSlides.$inferSelect;
export type MediaRow = typeof media.$inferSelect;