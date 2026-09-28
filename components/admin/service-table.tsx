"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { Badge, Button, ConfirmDialog, EmptyState, useToast } from "@/components/admin/ui";
import { ServiceIcon } from "@/components/public/service-icon";
import { deleteServiceAction, setServiceStatusAction } from "@/app/admin/(dashboard)/services/actions";

export interface ServiceTableRow {
  id: string;
  name: string;
  slug: string;
  icon: string;
  status: "active" | "inactive";
  /** Grid position, as chosen in the admin. */
  displayOrder: number;
  updatedAt: string;
}

const statusTone: Record<ServiceTableRow["status"], "green" | "gray"> = {
  active: "green",
  inactive: "gray",
};

export function ServiceTable({ rows, canManage }: { rows: ServiceTableRow[]; canManage: boolean }) {
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
        title="No services yet"
        description="Add the services you offer. Each one gets its own page on the public website."
        action={
          canManage ? (
            <Link href="/admin/services/new">
              <Button>Create service</Button>
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[#e4e9ea] bg-white shadow-[0_1px_2px_rgba(11,27,41,0.04)]">
      <table className="w-full min-w-[340px] text-left">
        <thead>
          <tr className="border-b border-[#eef1f0] text-[11px] font-extrabold uppercase tracking-wide text-[#8a969c]">
            <th className="px-4 py-3">Service</th>
            <th className="hidden px-4 py-3 md:table-cell">Order</th>
            <th className="px-4 py-3">Status</th>
            {canManage ? <th className="w-[110px] px-4 py-3 text-right">Actions</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0f2f1]">
          {rows.map((row) => (
            <tr key={row.id} className={row.status === "inactive" ? "opacity-55" : ""}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f4f1e9] text-[#aa761e]">
                    <ServiceIcon name={row.icon} size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-bold text-[#152431]">{row.name}</p>
                    <p className="truncate text-[11.5px] text-[#8a969c]">/services/{row.slug}</p>
                  </div>
                </div>
              </td>
              <td className="hidden px-4 py-3 text-[12.5px] text-[#5d6b73] md:table-cell">{row.displayOrder}</td>
              <td className="px-4 py-3">
                <Badge tone={statusTone[row.status]}>{row.status === "active" ? "Active" : "Inactive"}</Badge>
              </td>
              {canManage ? (
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      title={row.status === "active" ? "Hide from the website" : "Show on the website"}
                      aria-label={row.status === "active" ? "Hide from the website" : "Show on the website"}
                      onClick={() =>
                        run(
                          setServiceStatusAction([row.id], row.status === "active" ? "inactive" : "active"),
                          row.status === "active" ? "Service hidden." : "Service is now live.",
                        )
                      }
                      disabled={pending}
                      className="rounded-lg bg-[#e7a42b] p-2 text-[#172633] hover:bg-[#f3bb4e] disabled:opacity-40"
                    >
                      {row.status === "active" ? <Eye size={15} /> : <EyeOff size={15} />}
                    </button>
                    <button
                      type="button"
                      aria-label="Delete"
                      title="Delete"
                      onClick={() => setDeleteId(row.id)}
                      className="rounded-lg bg-[#b3261e] p-2 text-white hover:bg-[#991b1b]"
                    >
                      <Trash2 size={15} />
                    </button>
                    <Link
                      href={`/admin/services/${row.id}`}
                      aria-label="Edit"
                      title="Edit"
                      className="rounded-lg bg-[#e7a42b] p-2 text-[#172633] hover:bg-[#f3bb4e]"
                    >
                      <Pencil size={15} />
                    </Link>
                  </div>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete service"
        confirmLabel="Delete"
        danger
        busy={pending}
        message={
          <>
            Delete <strong>{rows.find((r) => r.id === deleteId)?.name}</strong>? This cannot be undone and the public URL
            will stop working.
          </>
        }
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          setDeleteId(null);
          run(deleteServiceAction([deleteId]), "Service deleted.");
        }}
      />
    </div>
  );
}
