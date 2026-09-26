"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { siteSettings } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { SETTING_KEYS, SETTING_VALUE_MAX_LENGTH } from "@/lib/settings";

export async function saveSettingsAction(values: Record<string, string>): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = await requireRole("settings");

    // Only the known keys are written, so an unexpected key in `values` can
    // never create a row the admin UI does not know how to render.
    const rows = SETTING_KEYS.map((key) => ({
      key,
      value: (values[key] ?? "").trim().slice(0, SETTING_VALUE_MAX_LENGTH),
    }));
    for (const row of rows) {
      await db
        .insert(siteSettings)
        .values(row)
        .onConflictDoUpdate({ target: siteSettings.key, set: { value: row.value, updated_at: new Date().toISOString() } });
    }

    await logAudit(auth.user, "update", "site_settings", "[site]", { keys: rows.map((r) => r.key) });
    revalidatePath("/admin/settings");
    revalidatePath("/", "layout");
    revalidatePath("/products", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Save failed." };
  }
}
