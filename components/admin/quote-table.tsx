"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, Pencil, Trash2 } from "lucide-react";
import { Badge, ConfirmDialog, EmptyState, quoteStatusTone, useToast } from "@/components/admin/ui";
import { QUOTE_STATUS_LABELS, type QuoteStatus } from "@/lib/types";
import { deleteQuoteAction, toggleQuoteArchiveAction } from "@/app/admin/(dashboard)/quotes/actions";

export interface QuoteRow {
  id: string;
  customer_name: string;
  customer_email: string;
  product_name: string;
  brand_name: string;
  quantity: number;
  status: QuoteStatus;
  archived: boolean;
  created_at: string;
}

export function QuoteTable({ rows }: { rows: QuoteRow[] }) {
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
    return <EmptyState title="No quote requests" description="Quote requests submitted from the website will appear here." />;
  }

  return (
    <div className="rounded-xl border border-[#e4e9ea] bg-white shadow-[0_1px_2px_rgba(11,27,41,0.04)]">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-[#eef1f0] text-[11px] font-extrabold uppercase tracking-wide text-[#8a969c]">
            <th className="px-4 py-3">Customer</th>
            <th className="hidden px-4 py-3 md:table-cell">Product</th>
            <th className="hidden px-4 py-3 sm:table-cell">Qty</th>
            <th className="px-4 py-3">Status</th>
            <th className="hidden px-4 py-3 sm:table-cell">Received</th>
            <th className="w-[150px] px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0f2f1]">
          {rows.map((row) => (
            <tr key={row.id} className={row.archived ? "opacity-55" : ""}>
              <td className="px-4 py-3">
                <p className="text-[13.5px] font-bold text-[#152431]">{row.customer_name}</p>
                <p className="text-[11.5px] text-[#8a969c]">{row.customer_email}</p>
              </td>
              <td className="hidden max-w-[260px] px-4 py-3 md:table-cell">
                <p className="truncate text-[13px] font-semibold text-[#41515b]">{row.product_name || "General enquiry"}</p>
                {row.brand_name && <p className="text-[11.5px] text-[#8a969c]">{row.brand_name}</p>}
              </td>
              <td className="hidden px-4 py-3 text-[13px] text-[#41515b] sm:table-cell">{row.quantity}</td>
              <td className="px-4 py-3">
                <Badge tone={quoteStatusTone[row.status]}>{QUOTE_STATUS_LABELS[row.status]}</Badge>
              </td>
              <td className="hidden px-4 py-3 text-[12.5px] text-[#65727a] sm:table-cell">{new Date(row.created_at).toLocaleDateString("en-GB")}</td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    title={row.archived ? "Restore" : "Archive"}
                    onClick={() => run(toggleQuoteArchiveAction([row.id], !row.archived), row.archived ? "Restored." : "Archived.")}
                    disabled={pending}
                    className="rounded-lg p-2 text-[#8a969c] hover:bg-[#f2f4f3] disabled:opacity-40"
                  >
                    {row.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                  </button>
                  <button type="button" aria-label="Delete" title="Delete" onClick={() => setDeleteId(row.id)} className="rounded-lg p-2 text-[#8a969c] hover:bg-[#fdeceb] hover:text-[#b3261e]">
                    <Trash2 size={15} />
                  </button>
                  <Link href={`/admin/quotes/${row.id}`} aria-label="Open" title="Open" className="rounded-lg bg-[#f2f4f3] p-2 text-[#41515b] hover:bg-[#0b1b29] hover:text-white">
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
        title="Delete quote request"
        confirmLabel="Delete"
        danger
        busy={pending}
        message="This permanently removes the quote request. This cannot be undone."
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          setDeleteId(null);
          run(deleteQuoteAction(deleteId), "Quote request deleted.");
        }}
      />
    </div>
  );
}