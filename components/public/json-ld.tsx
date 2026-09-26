import { jsonLdScript } from "@/lib/sanitize";

/**
 * Renders a JSON-LD block for structured data.
 *
 * The escaping lives in `lib/sanitize.ts` so there is exactly one
 * implementation. Do not inline a plain `JSON.stringify` here: a string value
 * containing `</script>` terminates the element early and everything after it is
 * parsed as markup, which is a stored-XSS vector for any field an editor can
 * type into (news titles, excerpts, body text).
 */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }} />;
}
