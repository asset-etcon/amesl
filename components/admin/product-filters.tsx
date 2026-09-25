"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input, Select } from "@/components/admin/ui";

interface Props {
  current: Record<string, string | undefined>;
  brands: { id: string; name: string }[];
  categories: { id: string; name: string }[];
}

export function ProductFilters({ current, brands, categories }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(current.q ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(current.q ?? ""), 0);
    return () => window.clearTimeout(t);
  }, [current.q]);

  const apply = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const next = { ...current, ...overrides };
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(`/admin/products${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  const onSearch = (value: string) => {
    setQ(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => apply({ q: value || undefined }), 350);
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-[220px] flex-1">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa6ab]" />
        <Input value={q} onChange={(e) => onSearch(e.target.value)} placeholder="Search products…" className="pl-9" />
      </div>
      <Select
        value={current.status ?? ""}
        onChange={(e) => apply({ status: e.target.value || undefined })}
        className="w-[150px]"
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        <option value="draft">Draft</option>
        <option value="published">Published</option>
        <option value="archived">Archived</option>
      </Select>
      <Select
        value={current.brand ?? ""}
        onChange={(e) => apply({ brand: e.target.value || undefined })}
        className="w-[170px]"
        aria-label="Filter by brand"
      >
        <option value="">All brands</option>
        {brands.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </Select>
      <Select
        value={current.category ?? ""}
        onChange={(e) => apply({ category: e.target.value || undefined })}
        className="w-[190px]"
        aria-label="Filter by category"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      <Select
        value={current.featured ?? ""}
        onChange={(e) => apply({ featured: e.target.value || undefined })}
        className="w-[130px]"
        aria-label="Filter by featured"
      >
        <option value="">All products</option>
        <option value="true">Featured</option>
        <option value="false">Not featured</option>
      </Select>
      {(current.q || current.status || current.brand || current.category || current.featured) && (
        <button
          type="button"
          onClick={() => apply({ q: undefined, status: undefined, brand: undefined, category: undefined, featured: undefined })}
          className="h-10 rounded-lg bg-[#b3261e] px-3 text-[12px] font-bold text-white hover:bg-[#991b1b]"
        >
          Clear
        </button>
      )}
    </div>
  );
}
