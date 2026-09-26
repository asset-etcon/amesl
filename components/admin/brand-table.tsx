"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Globe, Pencil, Star, Trash2 } from "lucide-react";
import { Badge, Button, ConfirmDialog, EmptyState, useToast } from "@/components/admin/ui";
import { deleteBrandAction, setBrandStatusAction } from "@/app/admin/(dashboard)/brands/actions";

export interface BrandRow {
  id: string;
  name: string;
  website: string;
  logo_url: string;
  status: "active" | "inactive";
  display_order: number;
  product_count: number;
}

export function BrandTable({ rows }: { rows: BrandRow[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
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

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No brands yet"
        description="Create brands for the technology partners AMESL represents, then assign products to them."
        action={
          <Link href="/admin/brands/new">
            <Button>Create brand</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#e4e9ea] bg-white shadow-[0_1px_2px_rgba(11,27,41,0.04)]">
      <table className="w-full min-w-[340px] text-left">
        <thead>
          <tr className="border-b border-[#eef1f0] text-[11px] font-extrabold uppercase tracking-wide text-[#8a969c]">
            <th className="px-4 py-3">Brand</th>
            <th className="hidden px-4 py-3 md:table-cell">Products</th>
            <th className="hidden px-4 py-3 lg:table-cell">Order</th>
            <th className="px-4 py-3">Status</th>
            <th className="w-[160px] px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0f2f1]">
          {rows.map((row) => (
            <tr key={row.id} className={row.status === "inactive" ? "opacity-55" : ""}>
              <td className="px-4 py-3">
                <Link href={`/admin/brands/${row.id}`} className="group flex items-center gap-3">
                  <div className="relative flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#eef1f0] bg-white p-1.5">
                    {row.logo_url ? (
                      <Image src={row.logo_url} alt={row.name} fill className="object-contain p-1" unoptimized />
                    ) : (
                      <span className="text-[10px] font-bold text-[#b8c3c9]">{row.name.slice(0, 2).toUpperCase()}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-[13.5px] font-bold text-[#152431] group-hover:text-[#bc7d0b]">{row.name}</p>
                    {row.website && (
                      <a href={row.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-[11.5px] text-[#8a969c] hover:text-[#bc7d0b]">
                        <Globe size={11} /> {row.website.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </div>
                </Link>
              </td>
              <td className="hidden px-4 py-3 text-[13px] text-[#41515b] md:table-cell">{row.product_count}</td>
              <td className="hidden px-4 py-3 text-[13px] text-[#41515b] lg:table-cell">{row.display_order}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Badge tone={row.status === "active" ? "green" : "gray"}>{row.status}</Badge>
                  <button
                    type="button"
                    title={row.status === "active" ? "Set inactive" : "Set active"}
                    onClick={() => run(setBrandStatusAction([row.id], row.status === "active" ? "inactive" : "active"), row.status === "active" ? "Brand hidden." : "Brand visible.")}
                    disabled={pending}
                    className="rounded-lg bg-[#e7a42b] p-1.5 text-[#172633] hover:bg-[#f3bb4e] disabled:opacity-40"
                  >
                    <Star size={13} />
                  </button>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <button type="button" aria-label="Delete" title="Delete" onClick={() => setDeleteId(row.id)} className="rounded-lg bg-[#b3261e] p-2 text-white hover:bg-[#991b1b]">
                    <Trash2 size={15} />
                  </button>
                  <Link href={`/admin/brands/${row.id}`} aria-label="Edit" title="Edit" className="rounded-lg bg-[#e7a42b] p-2 text-[#172633] hover:bg-[#f3bb4e]">
                    <Pencil size={15} />
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete brand"
        confirmLabel="Delete"
        danger
        busy={pending}
        message={
          <>
            Delete <strong>{rows.find((r) => r.id === deleteId)?.name}</strong>? This cannot be undone. Brands still used by a product cannot be deleted.
          </>
        }
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          setDeleteId(null);
          run(deleteBrandAction([deleteId]), "Brand deleted.");
        }}
      />
    </div>
  );
}