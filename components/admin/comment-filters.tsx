"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/admin/ui";

interface Props {
  current: Record<string, string | undefined>;
}

export function CommentFilters({ current }: Props) {
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
    // Any filter change invalidates the current page number.
    params.delete("page");
    const qs = params.toString();
    router.push(`/admin/comments${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const onSearch = (value: string) => {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => apply({ q: value || undefined }), 350);
  };

  const active = Boolean(current.q || current.sort);

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[220px] flex-1">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa6ab]" />
        <Input
          value={q}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search name, email, comment or article…"
          className="pl-9"
          aria-label="Search comments"
        />
      </div>
      <Select
        value={current.sort ?? ""}
        onChange={(e) => apply({ sort: e.target.value || undefined })}
        className="w-[160px]"
        aria-label="Sort comments"
      >
        <option value="">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="author">Author A–Z</option>
        <option value="article">Article A–Z</option>
      </Select>
      {active && (
        <button
          type="button"
          onClick={() => apply({ q: undefined, sort: undefined })}
          className="h-10 rounded-lg bg-[#b3261e] px-3 text-[12px] font-bold text-white hover:bg-[#991b1b]"
        >
          Clear
        </button>
      )}
    </div>
  );
}
