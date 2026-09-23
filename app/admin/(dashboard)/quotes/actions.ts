"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { quoteRequests } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import type { QuoteStatus } from "@/lib/types";

const QUOTE_STATUSES: QuoteStatus[] = ["new", "contacted", "quotation_sent", "negotiating", "completed", "cancelled"];

export async function setQuoteStatusAction(id: string, status: QuoteStatus) {
  try {
    const { profile, user } = await requireRole("quotes");
    if (!QUOTE_STATUSES.includes(status)) return { ok: false, error: "Invalid status." };
    await db.update(quoteRequests).set({ status }).where(eq(quoteRequests.id, id));
    await logAudit(user, `set_status_${status}`, "quote", id, { role: profile.role });
    revalidatePath("/admin/quotes");
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Update failed." };
  }
}

export async function updateQuoteNotesAction(id: string, notes: string) {
  try {
    const auth = await requireRole("quotes_manage");
    await db.update(quoteRequests).set({ internal_notes: notes.slice(0, 4000) }).where(eq(quoteRequests.id, id));
    await logAudit(auth.user, "update_notes", "quote", id);
    revalidatePath(`/admin/quotes/${id}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Save failed." };
  }
}

export async function toggleQuoteArchiveAction(ids: string[], archived: boolean) {
  try {
    const auth = await requireRole("quotes_manage");
    await db.update(quoteRequests).set({ archived }).where(inArray(quoteRequests.id, ids));
    await logAudit(auth.user, archived ? "archive" : "restore", "quote", `[${ids.join(",")}]`);
    revalidatePath("/admin/quotes");
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Update failed." };
  }
}

export async function deleteQuoteAction(id: string) {
  try {
    const auth = await requireRole("quotes_manage");
    await db.delete(quoteRequests).where(eq(quoteRequests.id, id));
    await logAudit(auth.user, "delete", "quote", id);
    revalidatePath("/admin/quotes");
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Delete failed." };
  }
}