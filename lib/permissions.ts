import type { Role } from "@/lib/types";

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  product_manager: "Product Manager",
  content_manager: "Content Manager",
  sales: "Sales",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin: "Full access to every feature, user roles and site settings.",
  product_manager: "Manage products, brands and categories. View quotes.",
  content_manager: "Manage homepage content, news, media and categories.",
  sales: "View the catalogue and manage customer quote requests.",
};

const CAPABILITIES: Record<Role, string[]> = {
  super_admin: [
    "dashboard",
    "products",
    "products_manage",
    "brands",
    "categories",
    "quotes",
    "quotes_manage",
    "homepage",
    "media",
    "news",
    "news_manage",
    "users",
    "settings",
  ],
  product_manager: ["dashboard", "products", "products_manage", "brands", "categories", "quotes", "quotes_manage", "media"],
  content_manager: ["dashboard", "products", "categories", "homepage", "media", "news", "news_manage"],
  sales: ["dashboard", "products", "quotes"],
};

export function can(role: Role, permission: string): boolean {
  return CAPABILITIES[role]?.includes(permission) ?? false;
}

export function isRole(value: string): value is Role {
  return value in CAPABILITIES;
}