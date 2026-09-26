"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/admin/ui";

interface Props {
  current: Record<string, string | undefined>;
}

export function QuoteFilters({ current }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(current.q ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(current.q ?? ""), 0);
    return () => window.clearTimeout(t);
  }, [current.q]);

  const apply = (overrides: Record<string, string | undefined>) => {
    const next = { ...current, ...overrides };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(`/admin/quotes${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const onSearch = (value: string) => {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => apply({ q: value || undefined }), 350);
  };

  const active = Boolean(current.q || current.sort || (current.view && current.view !== "active"));

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[220px] flex-1">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa6ab]" />
        <Input value={q} onChange={(e) => onSearch(e.target.value)} placeholder="Search name, email, company or product…" className="pl-9" aria-label="Search quote requests" />
      </div>
      <Select
        value={current.sort ?? ""}
        onChange={(e) => apply({ sort: e.target.value || undefined })}
        className="w-[160px]"
        aria-label="Sort quote requests"
      >
        <option value="">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="quantity">Largest quantity</option>
        <option value="customer">Customer A–Z</option>
      </Select>
      <Select
        value={current.view ?? "active"}
        onChange={(e) => apply({ view: e.target.value === "active" ? undefined : e.target.value })}
        className="w-[150px]"
        aria-label="Filter by archive state"
      >
        <option value="active">Active only</option>
        <option value="archived">Archived only</option>
        <option value="all">Active + archived</option>
      </Select>
      {active && (
        <button
          type="button"
          onClick={() => apply({ q: undefined, sort: undefined, view: undefined })}
          className="h-10 rounded-lg bg-[#b3261e] px-3 text-[12px] font-bold text-white hover:bg-[#991b1b]"
        >
          Clear
        </button>
      )}
    </div>
  );
}
