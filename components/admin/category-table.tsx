"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Star, Trash2 } from "lucide-react";
import { Badge, Button, ConfirmDialog, EmptyState, useToast } from "@/components/admin/ui";
import { deleteCategoryAction, setCategoryStatusAction } from "@/app/admin/(dashboard)/categories/actions";

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  status: "active" | "inactive";
  display_order: number;
}

export function CategoryTable({ rows }: { rows: CategoryRow[] }) {
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
        title="No categories yet"
        description="Create categories to organise the product catalogue."
        action={
          <Link href="/admin/categories/new">
            <Button>Create category</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="rounded-xl border border-[#e4e9ea] bg-white shadow-[0_1px_2px_rgba(11,27,41,0.04)]">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-[#eef1f0] text-[11px] font-extrabold uppercase tracking-wide text-[#8a969c]">
            <th className="px-4 py-3">Category</th>
            <th className="hidden px-4 py-3 md:table-cell">Order</th>
            <th className="px-4 py-3">Status</th>
            <th className="w-[150px] px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0f2f1]">
          {rows.map((row) => (
            <tr key={row.id} className={row.status === "inactive" ? "opacity-55" : ""}>
              <td className="px-4 py-3">
                <p className="text-[13.5px] font-bold text-[#152431]">{row.name}</p>
                <p className="text-[11.5px] text-[#8a969c]">/{row.slug}</p>
              </td>
              <td className="hidden px-4 py-3 text-[13px] text-[#41515b] md:table-cell">{row.display_order}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Badge tone={row.status === "active" ? "green" : "gray"}>{row.status}</Badge>
                  <button
                    type="button"
                    title={row.status === "active" ? "Set inactive" : "Set active"}
                    onClick={() => run(setCategoryStatusAction([row.id], row.status === "active" ? "inactive" : "active"), row.status === "active" ? "Category hidden." : "Category visible.")}
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
                  <Link href={`/admin/categories/${row.id}`} aria-label="Edit" title="Edit" className="rounded-lg bg-[#e7a42b] p-2 text-[#172633] hover:bg-[#f3bb4e]">
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
        title="Delete category"
        confirmLabel="Delete"
        danger
        busy={pending}
        message={
          <>
            Delete <strong>{rows.find((r) => r.id === deleteId)?.name}</strong>? Products in this category will simply become uncategorised.
          </>
        }
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          setDeleteId(null);
          run(deleteCategoryAction([deleteId]), "Category deleted.");
        }}
      />
    </div>
  );
}