"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/admin/sidebar";
import { Topbar } from "@/components/admin/topbar";
import { ToastProvider } from "@/components/admin/ui";
import type { Role } from "@/lib/types";

/**
 * Owns the mobile navigation drawer.
 *
 * The sidebar is a permanent rail from `lg` up and an off-canvas drawer below
 * it, and the two live in different places in the tree, so the open/closed
 * state has to sit above both. It is also closed on navigation, otherwise
 * following a link on a phone leaves the drawer covering the page you asked
 * for, and the backdrop swallows the first tap.
 */
export function AdminShell({
  role,
  email,
  fullName,
  children,
}: {
  role: Role;
  email: string;
  fullName: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on navigation. Done during render rather than in an effect, because an
  // effect that calls setState triggers a second render pass; React's supported
  // alternative is the "adjust state when a prop changes" pattern. This also
  // covers browser back/forward, which the link onClick in the sidebar does not.
  const [openedAt, setOpenedAt] = useState(pathname);
  if (pathname !== openedAt) {
    setOpenedAt(pathname);
    setOpen(false);
  }

  // The drawer traps nothing and scrolls the page behind it, so lock the body
  // while it is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="flex min-h-screen bg-[#f4f6f5]">
      <Sidebar role={role} open={open} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar email={email} role={role} fullName={fullName} onMenuClick={() => setOpen(true)} />
        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <ToastProvider>{children}</ToastProvider>
        </main>
      </div>
    </div>
  );
}
