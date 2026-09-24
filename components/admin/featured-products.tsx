"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { Button, EmptyState, useToast } from "@/components/admin/ui";
import { addFeaturedProductAction, moveFeaturedProductAction, removeFeaturedProductAction } from "@/app/admin/(dashboard)/homepage/actions";

export interface FeaturedRow {
  product_id: string;
  name: string;
  brand_name: string;
  slug: string;
  image_url: string | null;
  display_order: number;
}

export interface FeaturedOption {
  product_id: string;
  name: string;
}

export function FeaturedProducts({ rows, options }: { rows: FeaturedRow[]; options: FeaturedOption[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = useState("");
  const [pending, startTransition] = useTransition();

  const run = (promise: Promise<{ ok: boolean; error?: string }>, success: string) => {
    startTransition(async () => {
      const result = await promise;
      if (result.ok) {
        toast(success);
        router.refresh();
      } else {
        toast(result.error ?? "Failed.", "error");
      }
    });
  };

  const add = () => {
    if (!selected) return;
    const id = selected;
    setSelected("");
    run(addFeaturedProductAction(id), "Product featured.");
  };

  return (
    <div className="rounded-xl border border-[#e4e9ea] bg-white shadow-[0_1px_2px_rgba(11,27,41,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef1f0] px-5 py-4">
        <div>
          <h2 className="text-[14.5px] font-extrabold text-[#0b1b29]">Featured products</h2>
          <p className="text-[12px] text-[#8a969c]">Featured products appear on the website homepage in this order.</p>
        </div>
        {options.length > 0 && (
          <div className="flex items-center gap-2">
            <select value={selected} onChange={(e) => setSelected(e.target.value)} className="h-10 rounded-lg border border-[#d7dee0] bg-white px-3 text-[13px] font-semibold text-[#152431] outline-none">
              <option value="">Add a product…</option>
              {options.map((o) => (
                <option key={o.product_id} value={o.product_id}>{o.name}</option>
              ))}
            </select>
            <Button size="sm" onClick={add} disabled={!selected} busy={pending}>
              <Plus size={14} /> Add
            </Button>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No featured products"
          description="Feature published products to showcase them on the homepage."
          action={
            options.length ? (
              <div className="flex items-center gap-2">
                <select value={selected} onChange={(e) => setSelected(e.target.value)} className="h-10 rounded-lg border border-[#d7dee0] bg-white px-3 text-[13px] font-semibold text-[#152431] outline-none">
                  <option value="">Add a product…</option>
                  {options.map((o) => (
                    <option key={o.product_id} value={o.product_id}>{o.name}</option>
                  ))}
                </select>
                <Button size="sm" onClick={add} disabled={!selected} busy={pending}>
                  <Plus size={14} /> Add
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : (
        <ul className="divide-y divide-[#f0f2f1]">
          {rows.map((row, i) => (
            <li key={row.product_id} className="flex items-center gap-3 px-5 py-3">
              <span className="w-5 text-center text-[11px] font-bold text-[#8a969c]">{i + 1}</span>
              <div className="relative h-11 w-16 shrink-0 overflow-hidden rounded-lg border border-[#eef1f0] bg-[#eef1f0]">
                {row.image_url ? <Image src={row.image_url} alt={row.name} fill className="object-cover" unoptimized /> : <span className="grid h-full w-full place-items-center text-[10px] font-bold text-[#b8c3c9]">{row.brand_name.slice(0, 2).toUpperCase()}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/products/${row.product_id}`} className="block truncate text-[13.5px] font-bold text-[#152431] hover:text-[#bc7d0b]">
                  {row.name}
                </Link>
                <p className="text-[11.5px] text-[#8a969c]">{row.brand_name}</p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Move up" title="Move up" onClick={() => run(moveFeaturedProductAction(row.product_id, "up"), "Reordered.")} disabled={i === 0 || pending} className="rounded-lg bg-[#e7a42b] p-2 text-[#172633] hover:bg-[#f3bb4e] disabled:opacity-30">
                  <ChevronUp size={15} />
                </button>
                <button type="button" aria-label="Move down" title="Move down" onClick={() => run(moveFeaturedProductAction(row.product_id, "down"), "Reordered.")} disabled={i === rows.length - 1 || pending} className="rounded-lg bg-[#e7a42b] p-2 text-[#172633] hover:bg-[#f3bb4e] disabled:opacity-30">
                  <ChevronDown size={15} />
                </button>
                <button type="button" aria-label="Remove" title="Remove from homepage" onClick={() => run(removeFeaturedProductAction(row.product_id), "Removed from homepage.")} className="rounded-lg bg-[#b3261e] p-2 text-white hover:bg-[#991b1b]">
                  <X size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}