import { db } from "@/lib/db";
import { siteSettings } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata = { title: "Site settings | AMESL Admin" };

export default async function SettingsPage() {
  await requireRole("settings");

  const rows = await db.select({ key: siteSettings.key, value: siteSettings.value }).from(siteSettings);
  const initial: Record<string, string> = {};
  for (const row of rows) initial[row.key] = row.value;

  return (
    <div>
      <PageHeader
        title="Site settings"
        description="Contact details, addresses and footer copy used across the public website. Changes take effect immediately after saving."
      />
      <SettingsForm initial={initial} />
    </div>
  );
}
