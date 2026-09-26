"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Star, Trash2 } from "lucide-react";
import { Badge, Button, ConfirmDialog, EmptyState, useToast } from "@/components/admin/ui";
import {
  deleteNewsPostAction,
  setNewsPostFeaturedAction,
  setNewsPostStatusAction,
} from "@/app/admin/(dashboard)/news/actions";
import { NEWS_STATUS_LABELS, type NewsStatus } from "@/lib/types";

export interface NewsTableRow {
  id: string;
  title: string;
  slug: string;
  status: NewsStatus;
  featured: boolean;
  /** ISO instant, or null when the post publishes immediately on status change. */
  publishAt: string | null;
  /** Server-computed visibility, so the admin never disagrees with the public site. */
  isPublic: boolean;
  categoryName: string | null;
  updatedAt: string;
}

const statusTone: Record<NewsStatus, "gray" | "green" | "amber"> = {
  draft: "gray",
  published: "green",
  archived: "amber",
};

export function NewsTable({ rows, canManage }: { rows: NewsTableRow[]; canManage: boolean }) {
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
        title="No articles yet"
        description="Create your first article to publish news and updates on the website."
        action={
          <Link href="/admin/news/new">
            <Button>Create article</Button>
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
            <th className="px-4 py-3">Article</th>
            <th className="hidden px-4 py-3 md:table-cell">Category</th>
            <th className="hidden px-4 py-3 lg:table-cell">Publish</th>
            <th className="px-4 py-3">Status</th>
            {canManage ? <th className="w-[150px] px-4 py-3 text-right">Actions</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0f2f1]">
          {rows.map((row) => {
            const scheduled = row.status === "published" && row.publishAt && !row.isPublic;
            return (
              <tr key={row.id} className={row.status === "archived" ? "opacity-55" : ""}>
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    {row.featured ? <Star size={14} className="mt-1 shrink-0 text-[#e7a42b]" fill="#e7a42b" /> : null}
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-bold text-[#152431]">{row.title}</p>
                      <p className="truncate text-[11.5px] text-[#8a969c]">/news/{row.slug}</p>
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-3 text-[13px] text-[#41515b] md:table-cell">
                  {row.categoryName ?? "Ã¢â‚¬â€"}
                </td>
                <td className="hidden px-4 py-3 text-[12.5px] text-[#5d6b73] lg:table-cell">
                  {row.publishAt ? (
                    <span>
                      {new Date(row.publishAt).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  ) : (
                    <span className="text-[#8a969c]">Immediately</span>
                  )}
                  {scheduled ? (
                    <Badge tone="amber" className="ml-2">
                      Scheduled
                    </Badge>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={statusTone[row.status]}>{NEWS_STATUS_LABELS[row.status]}</Badge>
                </td>
                {canManage ? (
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        title={row.featured ? "Remove from featured" : "Mark as featured"}
                        aria-label={row.featured ? "Remove from featured" : "Mark as featured"}
                        onClick={() =>
                          run(
                            setNewsPostFeaturedAction([row.id], !row.featured),
                            row.featured ? "Removed from featured." : "Marked as featured.",
                          )
                        }
                        disabled={pending}
                        className="rounded-lg bg-[#e7a42b] p-2 text-[#172633] hover:bg-[#f3bb4e] disabled:opacity-40"
                      >
                        <Star size={15} fill={row.featured ? "#172633" : "none"} />
                      </button>
                      <button
                        type="button"
                        title="Move to drafts"
                        aria-label="Move to drafts"
                        onClick={() => run(setNewsPostStatusAction([row.id], "draft"), "Moved to drafts.")}
                        disabled={pending || row.status === "draft"}
                        className="rounded-lg bg-[#e4e9ea] p-2 text-[#41515b] hover:bg-[#d5dde0] disabled:opacity-40"
                      >
                        <Pencil size={15} />
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
                        href={`/admin/news/${row.id}`}
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
            );
          })}
        </tbody>
      </table>

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete article"
        confirmLabel="Delete"
        danger
        busy={pending}
        message={
          <>
            Delete <strong>{rows.find((r) => r.id === deleteId)?.title}</strong>? This cannot be undone and the public URL will
            stop working.
          </>
        }
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          setDeleteId(null);
          run(deleteNewsPostAction([deleteId]), "Article deleted.");
        }}
      />
    </div>
  );
}
