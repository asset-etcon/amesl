"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArchiveRestore, Trash2 } from "lucide-react";
import { Button, ConfirmDialog, Select, Textarea, useToast } from "@/components/admin/ui";
import { QUOTE_STATUS_LABELS, type QuoteStatus } from "@/lib/types";
import { deleteQuoteAction, setQuoteStatusAction, toggleQuoteArchiveAction, updateQuoteNotesAction } from "@/app/admin/(dashboard)/quotes/actions";

const STATUSES: QuoteStatus[] = ["new", "contacted", "quotation_sent", "negotiating", "completed", "cancelled"];

export function QuoteDetailControls({ id, initialStatus, initialNotes, canManage }: { id: string; initialStatus: QuoteStatus; initialNotes: string; canManage: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = useState<QuoteStatus>(initialStatus);
  const [notes, setNotes] = useState(initialNotes);
  const [savedNotes, setSavedNotes] = useState(initialNotes);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const t = window.setTimeout(() => {
      setStatus(initialStatus);
      setNotes(initialNotes);
      setSavedNotes(initialNotes);
    }, 0);
    return () => window.clearTimeout(t);
  }, [initialStatus, initialNotes]);

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

  const onStatusChange = (next: QuoteStatus) => {
    setStatus(next);
    if (next !== initialStatus) {
      run(setQuoteStatusAction(id, next), `Status set to ${QUOTE_STATUS_LABELS[next]}.`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#e4e9ea] bg-white p-5 shadow-[0_1px_2px_rgba(11,27,41,0.04)]">
        <label className="mb-1.5 block text-[12px] font-bold text-[#41515b]">Status</label>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={status} onChange={(e) => onStatusChange(e.target.value as QuoteStatus)} className="w-[220px]" disabled={pending}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {QUOTE_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Button variant="ghost" size="sm" onClick={() => run(toggleQuoteArchiveAction([id], false), "Restored.")}>
            <ArchiveRestore size={14} /> Restore
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-[#e4e9ea] bg-white p-5 shadow-[0_1px_2px_rgba(11,27,41,0.04)]">
        <label className="mb-1.5 block text-[12px] font-bold text-[#41515b]">Internal notes</label>
        <p className="mb-2 text-[12px] text-[#8a969c]">Only visible to the team. Track follow-ups here.</p>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000} className="min-h-[140px]" placeholder="Add context, follow-up actions or next steps…" disabled={!canManage} />
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setNotes(savedNotes)} disabled={notes === savedNotes || pending}>
            Reset
          </Button>
          <Button
            size="sm"
            onClick={() =>
              run(updateQuoteNotesAction(id, notes).then((r) => (r.ok ? { ...r, ok: true } : r)), "Notes saved.")
            }
            disabled={notes === savedNotes || !canManage}
            busy={pending}
          >
            Save notes
          </Button>
        </div>
      </div>

      {canManage && (
        <div className="flex items-center justify-between rounded-xl border border-[#f3d6d4] bg-[#fff7f7] p-4">
          <p className="text-[12.5px] font-semibold text-[#b3261e]">Danger zone — permanently remove this request.</p>
          <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={14} /> Delete request
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete quote request"
        confirmLabel="Delete"
        danger
        busy={pending}
        message="This permanently removes the quote request. This cannot be undone."
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false);
          run(deleteQuoteAction(id), "Quote request deleted.");
        }}
      />
    </div>
  );
}