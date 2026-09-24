"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/actions/auth";
import { ROLE_LABELS } from "@/lib/permissions";
import { Badge } from "@/components/admin/ui";
import type { Role } from "@/lib/types";

export function Topbar({ email, role, fullName }: { email: string; role: Role; fullName: string }) {
  const router = useRouter();

  const signOut = async () => {
    await signOutAction();
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#e4e9ea] bg-white px-6 lg:px-8">
      <div>
        <p className="text-[13px] font-bold text-[#152431]">{fullName || "Administrator"}</p>
        <p className="text-[11.5px] text-[#8a969c]">{email}</p>
      </div>
      <div className="flex items-center gap-3">
        <Badge tone={role === "super_admin" ? "navy" : "blue"}>{ROLE_LABELS[role]}</Badge>
        <button
          type="button"
          onClick={signOut}
          className="flex h-9 items-center gap-2 rounded-lg border border-[#e7a42b] bg-[#e7a42b] px-3 text-[12.5px] font-bold text-[#172633] transition-colors hover:border-[#b3261e] hover:bg-[#b3261e] hover:text-white"
        >
          <LogOut size={14} /> Sign out
        </button>
      </div>
    </header>
  );
}
