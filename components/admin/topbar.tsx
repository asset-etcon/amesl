"use client";

import { useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import { Badge } from "@/components/admin/ui";
import type { Role } from "@/lib/types";

export function Topbar({
  email,
  role,
  fullName,
  onMenuClick,
}: {
  email: string;
  role: Role;
  fullName: string;
  onMenuClick: () => void;
}) {
  const router = useRouter();

  const signOut = async () => {
    await signOutAction();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-[#e4e9ea] bg-white px-4 sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="-ml-1.5 shrink-0 rounded-lg p-2 text-[#152431] hover:bg-[#eef1f0] lg:hidden"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold text-[#152431]">{fullName || "Administrator"}</p>
          {/* The address is reference information, not navigation: it is the
              first thing to go when a phone is only ~320px wide. */}
          <p className="hidden truncate text-[11.5px] text-[#8a969c] sm:block">{email}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <span className="hidden sm:inline-flex">
          <Badge tone={role === "super_admin" ? "navy" : "blue"}>{ROLE_LABELS[role]}</Badge>
        </span>
        <button
          type="button"
          onClick={signOut}
          aria-label="Sign out"
          className="flex h-9 shrink-0 items-center gap-2 rounded-lg border border-[#e7a42b] bg-[#e7a42b] px-2.5 text-[12px] font-bold text-[#172633] transition-colors hover:border-[#b3261e] hover:bg-[#b3261e] hover:text-white sm:px-3"
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  );
}
