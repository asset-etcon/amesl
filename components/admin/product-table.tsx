"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Copy, Eye, Pencil, Star, Trash2 } from "lucide-react";
import { Badge, Button, ConfirmDialog, EmptyState, Pagination, productStatusTone, useToast } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";
import {
  deleteProductsAction,
  duplicateProductAction,
  setProductFeaturedAction,
  setProductStatusAction,
} from "@/app/admin/(dashboard)/products/actions";
import type { ProductStatus } from "@/lib/types";

export interface ProductRow {
  id: string;
  name: string;
  slug: string;
  status: ProductStatus;
  featured: boolean;
  updated_at: string;
  brand_name: string | null;
  brand_slug: string | null;
  category_name: string | null;
  primary_image: string | null;
}

interface Props {
  rows: ProductRow[];
  page: number;
  pageCount: number;
  total: number;
  canManage: boolean;
}

export function ProductTable({ rows, page, pageCount, total, canManage }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteMany, setDeleteMany] = useState(false);
  const [pending, startTransition] = useTransition();

  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r.id));
  const bulkBusy = pending;

  const toggle = (id: string) => setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleAll = () => setSelected(allSelected ? [] : rows.map((r) => r.id));

  const run = (promise: Promise<{ ok: boolean; error?: string }>, success: string) => {
    startTransition(async () => {
      const result = await promise;
      if (result.ok) {
        toast(success);
        setSelected([]);
        router.refresh();
      } else {
        toast(result.error ?? "Something went wrong.", "error");
      }
    });
  };

  const bulkStatus = (status: ProductStatus) => run(setProductStatusAction(selected, status), `${selected.length} product(s) ${status}.`);
  const bulkFeatured = (featured: boolean) => run(setProductFeaturedAction(selected, featured), featured ? "Marked as featured." : "Unmarked featured.");
  const bulkDelete = () =>
    run(deleteProductsAction(selected), `${selected.length} product(s) deleted.`);

  return (
    <div className="overflow-x-auto rounded-xl border border-[#e4e9ea] bg-white shadow-[0_1px_2px_rgba(11,27,41,0.04)]">
      {canManage && selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#eef1f0] bg-[#f7f9f8] px-4 py-2.5">
          <span className="mr-1 text-[12.5px] font-bold text-[#41515b]">{selected.length} selected</span>
          <Button size="sm" variant="outline" onClick={() => bulkStatus("published")} busy={bulkBusy}>
            Publish
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkStatus("draft")} busy={bulkBusy}>
            Draft
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkStatus("archived")} busy={bulkBusy}>
            Archive
          </Button>
          <Button size="sm" variant="outline" onClick={() => bulkFeatured(true)} busy={bulkBusy}>
            <Star size={14} /> Featured
          </Button>
          <Button size="sm" variant="danger" onClick={() => { setDeleteMany(true); setDeleteId(null); }} busy={bulkBusy}>
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="No products found"
            description="Adjust your filters, or create a new product to start building the catalogue."
            action={
              <Link href="/admin/products/new">
                <Button>Create product</Button>
              </Link>
            }
          />
        </div>
      ) : (
        <table className="w-full min-w-[340px] text-left">
          <thead>
            <tr className="border-b border-[#eef1f0] text-[11px] font-extrabold uppercase tracking-wide text-[#8a969c]">
              {canManage && (
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-[#0b1b29]" />
                </th>
              )}
              <th className="px-4 py-3">Product</th>
              <th className="hidden px-4 py-3 md:table-cell">Brand</th>
              <th className="hidden px-4 py-3 lg:table-cell">Category</th>
              <th className="px-4 py-3">Status</th>
              <th className="hidden px-4 py-3 sm:table-cell">Updated</th>
              <th className="w-[170px] px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f2f1]">
            {rows.map((row) => (
              <tr key={row.id} className={row.status === "archived" ? "opacity-55" : ""}>
                {canManage && (
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.includes(row.id)} onChange={() => toggle(row.id)} className="h-4 w-4 accent-[#0b1b29]" />
                  </td>
                )}
                <td className="px-4 py-3">
                  <Link href={`/admin/products/${row.id}`} className="group flex items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[#eef1f0] bg-[#f2f4f3]">
                      {row.primary_image ? (
                        <Image src={row.primary_image} alt="" fill className="object-cover" unoptimized />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[10px] font-bold text-[#b8c3c9]">IMG</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-[13.5px] font-bold text-[#152431] group-hover:text-[#bc7d0b]">
                        {row.name}
                        {row.featured && <Star size={13} className="shrink-0 fill-[#e7a42b] text-[#e7a42b]" />}
                      </p>
                      <p className="truncate text-[11.5px] text-[#8a969c]">/{row.brand_name?.toLowerCase()}/Ã¢â‚¬Â¦</p>
                    </div>
                  </Link>
                </td>
                <td className="hidden px-4 py-3 text-[13px] text-[#41515b] md:table-cell">{row.brand_name ?? "Ã¢â‚¬â€"}</td>
                <td className="hidden px-4 py-3 text-[13px] text-[#41515b] lg:table-cell">{row.category_name ?? "Ã¢â‚¬â€"}</td>
                <td className="px-4 py-3">
                  <Badge tone={productStatusTone[row.status]}>{row.status}</Badge>
                </td>
                <td className="hidden px-4 py-3 text-[12.5px] text-[#65727a] sm:table-cell">{formatDate(row.updated_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link href={`/products/${row.brand_slug ?? ""}/${row.slug}`} target="_blank" aria-label="View on site" title="View on site" className="rounded-lg bg-[#e7a42b] p-2 text-[#172633] hover:bg-[#f3bb4e]">
                      <Eye size={15} />
                    </Link>
                    <button type="button" aria-label="Duplicate" title="Duplicate" onClick={() => run(duplicateProductAction(row.id), "Duplicate created.")} disabled={pending} className="rounded-lg bg-[#e7a42b] p-2 text-[#172633] hover:bg-[#f3bb4e] disabled:opacity-40">
                      <Copy size={15} />
                    </button>
                    <button type="button" aria-label="Delete" title="Delete" onClick={() => { setDeleteId(row.id); setDeleteMany(false); }} className="rounded-lg bg-[#b3261e] p-2 text-white hover:bg-[#991b1b]">
                      <Trash2 size={15} />
                    </button>
                    <Link href={`/admin/products/${row.id}`} aria-label="Edit" title="Edit" className="rounded-lg bg-[#e7a42b] p-2 text-[#172633] hover:bg-[#f3bb4e]">
                      <Pencil size={15} />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pagination page={page} pageCount={pageCount} total={total} onPage={(p) => router.push(`/admin/products?page=${p}`)} />

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete product"
        confirmLabel="Delete"
        danger
        busy={pending}
        message={
          <>
            Permanently delete <strong>{deleteId ? rows.find((r) => r.id === deleteId)?.name ?? "this product" : ""}</strong>? Its images, specifications and documents will also be removed. This cannot be undone.
          </>
        }
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          setDeleteId(null);
          run(deleteProductsAction([deleteId]), "Product deleted.");
        }}
      />

      <ConfirmDialog
        open={deleteMany}
        title={`Delete ${selected.length} products?`}
        confirmLabel="Delete all"
        danger
        busy={pending}
        message="Selected products and their images, specifications and documents will be permanently removed. This cannot be undone."
        onCancel={() => setDeleteMany(false)}
        onConfirm={() => {
          setDeleteMany(false);
          bulkDelete();
        }}
      />
    </div>
  );
}