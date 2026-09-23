"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { siteSettings } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export const SETTING_KEYS = [
  "company_name",
  "company_short_name",
  "footer_about",
  "copyright_text",
  "email",
  "phone_primary",
  "phone_secondary",
  "address_head_office",
  "address_operations",
  "training_url",
] as const;

export async function saveSettingsAction(values: Record<string, string>): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = await requireRole("settings");

    const rows = SETTING_KEYS.map((key) => ({ key, value: (values[key] ?? "").trim().slice(0, 500) }));
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
