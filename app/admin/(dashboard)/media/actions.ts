"use server";

import { revalidatePath } from "next/cache";
import { desc, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { media } from "@/db/schema";
import { requireRole, requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { deleteObject, keyFromUrl } from "@/lib/storage";

export interface MediaRecordInput {
  name: string;
  url: string;
  file_type: string;
  size_bytes: number;
  width?: number | null;
  height?: number | null;
}

export interface MediaPickerItem {
  id: string;
  name: string;
  url: string;
  file_type: string;
}

export async function recordMediaAction(input: MediaRecordInput): Promise<{ ok: boolean; error?: string; id?: string }> {
  try {
    const auth = await requireRole("media");
    const [created] = await db
      .insert(media)
      .values({
        name: input.name.slice(0, 200),
        url: input.url,
        file_type: input.file_type,
        size_bytes: Math.max(0, Math.floor(input.size_bytes)),
        width: input.width ?? null,
        height: input.height ?? null,
        uploaded_by: auth.user.id,
      })
      .returning({ id: media.id });
    if (!created) throw new Error("Upload failed.");
    await logAudit(auth.user, "upload", "media", created.id, { name: input.name });
    revalidatePath("/admin/media");
    return { ok: true, id: created.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Upload failed." };
  }
}

export async function listMediaAction(): Promise<{ ok: true; items: MediaPickerItem[] } | { ok: false; error: string }> {
  try {
    await requireUser();
    const rows = await db
      .select({ id: media.id, name: media.name, url: media.url, file_type: media.file_type })
      .from(media)
      .orderBy(desc(media.created_at))
      .limit(100);
    return { ok: true, items: rows };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not load media." };
  }
}

export async function deleteMediaAction(ids: string[]): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = await requireRole("media");
    if (!ids.length) return { ok: false, error: "Select at least one file." };
    const rows = await db.select({ id: media.id, url: media.url }).from(media).where(inArray(media.id, ids));
    for (const row of rows) {
      const key = keyFromUrl(row.url);
      if (key) await deleteObject(key);
    }
    await db.delete(media).where(inArray(media.id, ids));
    await logAudit(auth.user, "delete", "media", `[${ids.join(",")}]`);
    revalidatePath("/admin/media");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Delete failed." };
  }
}
