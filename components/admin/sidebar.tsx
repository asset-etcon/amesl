"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Tag,
  FolderOpen,
  MessageSquare,
  Home,
  Images,
  Users,
  Settings,
  ExternalLink,
} from "lucide-react";
import { can, ROLE_LABELS } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

type NavItem = { href: string; permission: string; label: string; icon: typeof LayoutDashboard };

const NAV: NavItem[] = [
  { href: "/admin", permission: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/products", permission: "products", label: "Products", icon: Package },
  { href: "/admin/brands", permission: "brands", label: "Brands", icon: Tag },
  { href: "/admin/categories", permission: "categories", label: "Categories", icon: FolderOpen },
  { href: "/admin/quotes", permission: "quotes", label: "Quote requests", icon: MessageSquare },
];

const NAV_WEBSITE: NavItem[] = [
  { href: "/admin/homepage", permission: "homepage", label: "Homepage", icon: Home },
  { href: "/admin/media", permission: "media", label: "Media library", icon: Images },
];

const NAV_SETTINGS: NavItem[] = [
  { href: "/admin/users", permission: "users", label: "Users & roles", icon: Users },
  { href: "/admin/settings", permission: "settings", label: "Site settings", icon: Settings },
];

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const renderLink = (item: NavItem) => {
    const { href, label, icon: Icon } = item;
    return (
    <Link
      key={href}
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors",
        isActive(href) ? "bg-white/10 text-[#f1b945]" : "text-[#b9c6cd] hover:bg-white/5 hover:text-white"
      )}
    >
      <Icon size={17} strokeWidth={2} />
      {label}
    </Link>
  );
  };

  const renderGroup = (title: string, items: NavItem[]) => (
    <div className="mt-5">
      <p className="px-3 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#5c7a88]">{title}</p>
      <div className="mt-1.5 space-y-0.5">{items.filter((i) => can(role, i.permission)).map(renderLink)}</div>
    </div>
  );

  return (
    <aside className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col bg-[#0b1b29]">
      <div className="flex items-center gap-2.5 px-4 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e7a42b] text-[13px] font-extrabold text-[#172633]">
          AM
        </div>
        <div>
          <p className="text-[12.5px] font-extrabold leading-4 text-white">Asset Matrix Energy</p>
          <p className="text-[11px] text-[#8ba2af]">Admin Dashboard</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        <div className="space-y-0.5">{NAV.filter((i) => can(role, i.permission)).map(renderLink)}</div>
        {renderGroup("Website", NAV_WEBSITE)}
        {renderGroup("Settings", NAV_SETTINGS)}
      </nav>
      <div className="border-t border-white/10 px-4 py-4">
        <p className="mb-2 text-[11px] text-[#5c7a88]">Signed in as</p>
        <p className="truncate text-[12px] font-bold text-white">{ROLE_LABELS[role]}</p>
        <Link href="/" target="_blank" className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-[#f1b945] hover:underline">
          <ExternalLink size={13} /> View live site
        </Link>
      </div>
    </aside>
  );
}