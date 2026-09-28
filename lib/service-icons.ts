/**
 * The icons a service may be shown with, as a closed list of keys.
 *
 * This lives in `lib/` and contains no React for the same reason `lib/settings.ts`
 * does: a `"use server"` module may only export async functions, so any other
 * export is replaced in a client bundle by a non-iterable proxy. `lib/validators.ts`
 * turns this into a `z.enum`, which is what actually stops an admin-entered value
 * from reaching the DOM — the key is looked up in the map in
 * `components/public/service-icon.tsx` and never interpolated as markup.
 *
 * The mapping from key to component lives with the component, not here, so this
 * module can be imported from a validator without pulling the icon library in.
 */
export const SERVICE_ICON_KEYS = [
  "motor",
  "thermometer",
  "ultrasound",
  "crosshair",
  "scanline",
  "balance",
  "waves",
  "sliders",
  "wrench",
  "zap",
  "activity",
  "gauge",
  "shield",
] as const;

export type ServiceIconKey = (typeof SERVICE_ICON_KEYS)[number];

/** Shown when a stored key is empty or, after a rename, no longer recognised. */
export const DEFAULT_SERVICE_ICON: ServiceIconKey = "activity";

export function isServiceIconKey(value: string | null | undefined): value is ServiceIconKey {
  return typeof value === "string" && (SERVICE_ICON_KEYS as readonly string[]).includes(value);
}

/**
 * Coerces a stored icon key to one that is safe to render, falling back to the
 * default. A key is validated on write, but a rename above can leave old rows
 * holding a value this build no longer knows, and an unrecognised key must never
 * reach the icon map.
 *
 * Deliberately lives here rather than in `lib/services.ts`: this module has no
 * Drizzle or schema import, so the client components that render an icon (the
 * admin service table and form) do not pull the database layer into their bundle.
 */
export function resolveServiceIcon(value: string | null | undefined): ServiceIconKey {
  return isServiceIconKey(value) ? value : DEFAULT_SERVICE_ICON;
}
