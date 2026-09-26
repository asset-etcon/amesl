/**
 * Normalises a database timestamp to the ISO 8601 string that XML Schema,
 * JSON-LD and Next.js metadata all require.
 *
 * `db/schema.ts` declares its timestamps as `timestamptz` with `mode: "string"`,
 * so node-postgres hands them back exactly as Postgres formats them:
 *
 *     2026-09-23 16:18:44.799753+00
 *
 * That is *not* a valid W3C dateTime: the date and time are separated by a
 * space rather than "T", and the offset is "+00" rather than "+00:00" or "Z".
 * Passing it straight through makes Google reject an entire sitemap
 * ("An invalid date was found"), and produces subtly wrong `dateModified`
 * values in page metadata, so every externally visible date is funnelled
 * through here.
 *
 * `new Date(...)` alone is not a fix: V8 happens to parse the Postgres format
 * leniently, but that behaviour is engine-specific and an invalid input then
 * yields an Invalid Date rather than an error.
 */
export function toIsoTimestamp(
  value: Date | string | null | undefined,
  fallback: string,
): string {
  if (value === null || value === undefined || value === "") return fallback;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? fallback : value.toISOString();
  }

  // "2026-09-23 16:18:44.799753+00" -> "2026-09-23T16:18:44.799753+00:00"
  const normalised = value.trim().replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
  const parsed = new Date(normalised);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}
