"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { Badge, Button, ConfirmDialog, EmptyState, useToast } from "@/components/admin/ui";
import { deleteHeroSlidesAction, setHeroSlideStatusAction } from "@/app/admin/(dashboard)/hero-slides/actions";

export interface HeroSlideRow {
  id: string;
  headline: string;
  image: string;
  status: "active" | "inactive";
  display_order: number;
}

export function HeroSlideTable({ rows, canManage }: { rows: HeroSlideRow[]; canManage: boolean }) {
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
        title="No hero slides"
        description="Add slides to display on the website homepage. Active slides autoplay in the hero banner."
        action={
          canManage ? (
            <Link href="/admin/hero-slides/new">
              <Button>Add slide</Button>
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
            <th className="px-4 py-3">Slide</th>
            <th className="hidden px-4 py-3 sm:table-cell">Order</th>
            <th className="px-4 py-3">Status</th>
            <th className="w-[150px] px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0f2f1]">
          {rows.map((row) => (
            <tr key={row.id} className={row.status === "inactive" ? "opacity-55" : ""}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg border border-[#eef1f0] bg-[#eef1f0]">
                    {row.image ? <Image src={row.image} alt={row.headline} fill className="object-cover" /> : <span className="block h-full w-full" />}
                  </div>
                  <p className="max-w-[320px] truncate text-[13.5px] font-bold text-[#152431]">{row.headline}</p>
                </div>
              </td>
              <td className="hidden px-4 py-3 text-[13px] text-[#41515b] sm:table-cell">{row.display_order}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Badge tone={row.status === "active" ? "green" : "gray"}>{row.status}</Badge>
                  {canManage && (
                    <button
                      type="button"
                      title={row.status === "active" ? "Hide from site" : "Show on site"}
                      onClick={() => run(setHeroSlideStatusAction(row.id, row.status === "active" ? "inactive" : "active"), row.status === "active" ? "Slide hidden." : "Slide visible.")}
                      disabled={pending}
                      className="rounded-lg bg-[#e7a42b] p-1.5 text-[#172633] hover:bg-[#f3bb4e] disabled:opacity-40"
                    >
                      {row.status === "active" ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  {canManage && (
                    <>
                      <button type="button" aria-label="Delete" title="Delete" onClick={() => setDeleteId(row.id)} className="rounded-lg bg-[#b3261e] p-2 text-white hover:bg-[#991b1b]">
                        <Trash2 size={15} />
                      </button>
                      <Link href={`/admin/hero-slides/${row.id}`} aria-label="Edit" title="Edit" className="rounded-lg bg-[#e7a42b] p-2 text-[#172633] hover:bg-[#f3bb4e]">
                        <Pencil size={15} />
                      </Link>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete hero slide"
        confirmLabel="Delete"
        danger
        busy={pending}
        message="This permanently removes the slide from the homepage. This cannot be undone."
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          setDeleteId(null);
          run(deleteHeroSlidesAction([deleteId]), "Slide deleted.");
        }}
      />
    </div>
  );
}