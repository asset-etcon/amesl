"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { Badge, Button, ConfirmDialog, EmptyState, Pagination, useToast } from "@/components/admin/ui";
import { deleteCommentsAction, setCommentStatusAction } from "@/app/admin/(dashboard)/comments/actions";
import { formatDateTime } from "@/lib/utils";

export interface CommentRow {
  id: string;
  author_name: string;
  author_email: string;
  body: string;
  status: "published" | "hidden";
  created_at: string;
  post_title: string;
  post_slug: string;
}

interface Props {
  rows: CommentRow[];
  page: number;
  pageCount: number;
  total: number;
  canManage: boolean;
  query: Record<string, string | undefined>;
}

export function CommentTable({ rows, page, pageCount, total, canManage, query }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
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

  // Re-serialises the active filters so paging never drops the search term, and
  // omits `page` entirely on page one rather than emitting ?page=1.
  const goToPage = (next: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value) params.set(key, value);
    }
    if (next > 1) params.set("page", String(next));
    const qs = params.toString();
    router.push(`/admin/comments${qs ? `?${qs}` : ""}`, { scroll: false });
  };

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No comments"
        description="Comments appear here once a visitor posts one on a news article. Enable them per article from the News screen."
        action={
          <Link href="/admin/news">
            <Button>Go to News</Button>
          </Link>
        }
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-[#e4e9ea] bg-white shadow-[0_1px_2px_rgba(11,27,41,0.04)]">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-[#eef1f0] text-[11px] font-extrabold uppercase tracking-wide text-[#8a969c]">
              <th className="px-4 py-3">Author</th>
              <th className="px-4 py-3">Comment</th>
              <th className="hidden px-4 py-3 md:table-cell">Article</th>
              <th className="hidden px-4 py-3 sm:table-cell">Posted</th>
              <th className="px-4 py-3">Status</th>
              {canManage && <th className="w-[110px] px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f2f1]">
            {rows.map((row) => (
              <tr key={row.id} className={row.status === "hidden" ? "opacity-55" : ""}>
                <td className="px-4 py-3 align-top">
                  <p className="text-[13.5px] font-bold text-[#172633]">{row.author_name}</p>
                  <a href={`mailto:${row.author_email}`} className="text-[12px] text-[#65727a] hover:underline">
                    {row.author_email}
                  </a>
                </td>
                <td className="max-w-[380px] px-4 py-3 align-top">
                  {/* Long bodies wrap rather than truncate: the whole point of this
                      screen is reading what someone wrote before deciding. */}
                  <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[#41515b]">{row.body}</p>
                </td>
                <td className="hidden px-4 py-3 align-top md:table-cell">
                  <Link
                    href={`/news/${row.post_slug}`}
                    target="_blank"
                    className="text-[12.5px] text-[#41515b] hover:underline"
                  >
                    {row.post_title}
                  </Link>
                </td>
                <td className="hidden whitespace-nowrap px-4 py-3 align-top text-[12.5px] text-[#65727a] sm:table-cell">
                  {formatDateTime(row.created_at)}
                </td>
                <td className="px-4 py-3 align-top">
                  <Badge tone={row.status === "published" ? "green" : "gray"}>
                    {row.status === "published" ? "Published" : "Hidden"}
                  </Badge>
                </td>
                {canManage && (
                  <td className="px-4 py-3 text-right align-top">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        title={row.status === "published" ? "Hide from the article" : "Show on the article"}
                        aria-label={row.status === "published" ? "Hide comment" : "Show comment"}
                        disabled={pending}
                        onClick={() =>
                          run(
                            setCommentStatusAction([row.id], row.status === "published" ? "hidden" : "published"),
                            row.status === "published" ? "Comment hidden." : "Comment is live again.",
                          )
                        }
                        className="rounded-lg bg-[#e7a42b] p-2 text-[#172633] hover:bg-[#f3bb4e] disabled:opacity-50"
                      >
                        {row.status === "published" ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                      <button
                        type="button"
                        title="Delete permanently"
                        aria-label="Delete comment"
                        disabled={pending}
                        onClick={() => setDeleteIds([row.id])}
                        className="rounded-lg bg-[#b3261e] p-2 text-white hover:bg-[#991b1b] disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-[#eef1f0]">
          <Pagination page={page} pageCount={pageCount} total={total} onPage={goToPage} />
        </div>
      </div>

      <ConfirmDialog
        open={deleteIds !== null}
        title="Delete this comment?"
        onCancel={() => setDeleteIds(null)}
        onConfirm={() => {
          const ids = deleteIds ?? [];
          setDeleteIds(null);
          run(deleteCommentsAction(ids), "Comment deleted.");
        }}
        message={
          <>
            This removes the comment permanently, including from the article page. To take it down but keep a record of
            it, hide it instead.
          </>
        }
        confirmLabel="Delete"
      />
    </>
  );
}
