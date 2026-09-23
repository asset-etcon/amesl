"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Copy, FileText, Trash2 } from "lucide-react";
import { ConfirmDialog, EmptyState, useToast } from "@/components/admin/ui";
import { deleteMediaAction } from "@/app/admin/(dashboard)/media/actions";

export interface MediaRow {
  id: string;
  name: string;
  url: string;
  file_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  created_at: string;
}

function formatSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaGrid({ rows }: { rows: MediaRow[] }) {
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

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast("URL copied to clipboard.");
    } catch {
      toast("Could not copy URL.", "error");
    }
  };

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Media library is empty"
        description="Upload product images, PDFs and other files. Files are validated (images up to 5 MB, PDFs up to 10 MB) before upload."
      />
    );
  }

  const target = rows.find((r) => r.id === deleteId);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {rows.map((row) => {
          const isImage = row.file_type.startsWith("image/");
          return (
            <div key={row.id} className="group overflow-hidden rounded-xl border border-[#e4e9ea] bg-white shadow-[0_1px_2px_rgba(11,27,41,0.04)]">
              <div className="relative aspect-[4/3] bg-[#eef1f0]">
                {isImage ? (
                  <Image src={row.url} alt={row.name} fill sizes="(max-width: 640px) 50vw, 20vw" className="object-cover" unoptimized />
                ) : (
                  <span className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-[#b3261e]">
                    <FileText size={26} />
                    <em className="text-[10px] font-bold uppercase not-italic tracking-wide text-[#8a969c]">{(row.file_type.split("/")[1] || "pdf").slice(0, 5)}</em>
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="truncate text-[12.5px] font-bold text-[#152431]" title={row.name}>{row.name}</p>
                <p className="text-[11px] text-[#8a969c]">
                  {formatSize(row.size_bytes)}
                  {row.width && row.height ? ` · ${row.width}×${row.height}` : ""}
                </p>
                <div className="mt-2 flex items-center justify-end gap-1">
                  <button type="button" aria-label="Copy URL" title="Copy URL" onClick={() => void copy(row.url)} className="rounded-lg p-1.5 text-[#8a969c] hover:bg-[#f2f4f3]">
                    <Copy size={14} />
                  </button>
                  <button type="button" aria-label="Delete" title="Delete" onClick={() => setDeleteId(row.id)} className="rounded-lg p-1.5 text-[#8a969c] hover:bg-[#fdeceb] hover:text-[#b3261e]">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        title="Delete file"
        confirmLabel="Delete"
        danger
        busy={pending}
        message={
          <>
            Permanently delete <strong>{target?.name}</strong>? Files in use by products or slides may stop displaying.
          </>
        }
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          if (!deleteId) return;
          setDeleteId(null);
          run(deleteMediaAction([deleteId]), "File deleted.");
        }}
      />
    </>
  );
}