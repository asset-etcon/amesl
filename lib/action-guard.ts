/**
 * Next.js signals control flow — `redirect()` and `notFound()` — by *throwing*
 * an error carrying a `digest` string prefixed `NEXT_REDIRECT` / `NEXT_NOT_FOUND`.
 *
 * Server actions here wrap their work in `try { ... } catch (err) { return { ok:
 * false, error: err.message } }`. That catch cannot tell a framework signal from a
 * genuine failure, so it silently swallows the redirect: an unauthenticated
 * caller receives `{ ok: false, error: "NEXT_REDIRECT..." }` instead of being
 * sent to the login page, and the raw message reaches the browser.
 *
 * It fails *closed* (the throw happens before any mutation), so this is a
 * correctness and information-disclosure bug rather than a privilege bypass.
 * Calling `rethrowIfControlFlow(err)` as the first line of such a catch keeps the
 * framework signal intact.
 */
const CONTROL_FLOW_PREFIXES = ["NEXT_REDIRECT", "NEXT_NOT_FOUND", "NEXT_HTTP_ERROR_FALLBACK"] as const;

export function rethrowIfControlFlow(err: unknown): void {
  if (err && typeof err === "object" && "digest" in err) {
    const digest = (err as { digest?: unknown }).digest;
    if (typeof digest === "string" && CONTROL_FLOW_PREFIXES.some((p) => digest.startsWith(p))) {
      throw err;
    }
  }
}

/** Message to show a client after a genuine failure, without leaking internals. */
export function actionErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === "object" && "digest" in err) {
    const digest = (err as { digest?: unknown }).digest;
    if (typeof digest === "string" && digest.startsWith("NEXT_")) return fallback;
  }
  return err instanceof Error && err.message ? err.message : fallback;
}
