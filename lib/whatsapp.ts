/**
 * WhatsApp deep links for enquiry calls to action.
 *
 * `wa.me` only accepts bare digits with the country code, so the admin value
 * is normalised here rather than trusted verbatim. The site stores contact
 * details as free text with spaces, dashes and a leading `+`, all of which
 * would produce a broken link if passed through unchanged.
 */
export const DEFAULT_WHATSAPP_NUMBER = "2348089083495";

/** Digits only, with a locally entered `0808…` style number promoted to `234808…`. */
export function whatsappDigits(raw: string | null | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("0") ? `234${digits.slice(1)}` : digits;
}

/**
 * Returns the `wa.me` link, or `fallbackHref` when no usable number is set.
 *
 * The empty check is a truthiness test on purpose: settings are read as
 * `?? default` elsewhere, which does not catch an empty string, so a cleared
 * admin field must resolve to the fallback instead of `https://wa.me/?text=…`.
 */
export function whatsappHref(raw: string | null | undefined, message: string, fallbackHref: string): string {
  const digits = whatsappDigits(raw);
  if (!digits) return fallbackHref;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
