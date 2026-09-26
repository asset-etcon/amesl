/**
 * Editable site settings and their labels.
 *
 * This lives outside `app/admin/(dashboard)/settings/actions.ts` on purpose. A
 * `"use server"` module may only export async functions: any other export is
 * replaced in a client bundle by a client-reference stub, so a client component
 * importing a plain constant from one receives a non-iterable proxy instead of
 * the value. Keeping the list here lets both the server action and the client
 * form import the real array.
 */
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

export type SettingKey = (typeof SETTING_KEYS)[number];

/** `site_settings.value` is a plain text column with no separate length column. */
export const SETTING_VALUE_MAX_LENGTH = 500;
