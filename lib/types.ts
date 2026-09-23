export type Role = "super_admin" | "product_manager" | "content_manager" | "sales";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string;
  logo_url: string;
  website: string;
  status: "active" | "inactive";
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: "active" | "inactive";
  display_order: number;
  created_at: string;
  updated_at: string;
}

export type ProductStatus = "draft" | "published" | "archived";

export interface Product {
  id: string;
  name: string;
  slug: string;
  brand_id: string;
  category_id: string | null;
  short_description: string;
  description: string;
  status: ProductStatus;
  featured: boolean;
  seo_title: string;
  seo_description: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt: string;
  is_primary: boolean;
  display_order: number;
}

export interface ProductSpecification {
  id: string;
  product_id: string;
  name: string;
  value: string;
  display_order: number;
}

export interface ProductDocument {
  id: string;
  product_id: string;
  name: string;
  url: string;
  file_type: string;
  display_order: number;
}

export type QuoteStatus = "new" | "contacted" | "quotation_sent" | "negotiating" | "completed" | "cancelled";

export interface QuoteRequest {
  id: string;
  product_id: string | null;
  product_name: string;
  brand_name: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  company_name: string;
  message: string;
  quantity: number;
  status: QuoteStatus;
  internal_notes: string;
  archived: boolean;
  created_at: string;
}

export interface HeroSlide {
  id: string;
  image_desktop: string;
  image_mobile: string;
  headline: string;
  subtext: string;
  cta_label: string;
  cta_href: string;
  status: "active" | "inactive";
  display_order: number;
  created_at: string;
}

export interface MediaItem {
  id: string;
  name: string;
  url: string;
  file_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  created_at: string;
}

export interface SiteSetting {
  key: string;
  value: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_email: string;
  action: string;
  resource: string;
  resource_id: string;
  details: Record<string, unknown>;
  created_at: string;
}

export const PRODUCT_STATUS_LABELS: Record<ProductStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  new: "New",
  contacted: "Contacted",
  quotation_sent: "Quotation sent",
  negotiating: "Negotiating",
  completed: "Completed",
  cancelled: "Cancelled",
};