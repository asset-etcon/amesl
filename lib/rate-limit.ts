import { createHash, timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Per-process sliding-window counter store. Deliberately in-memory: it needs no
 * new infrastructure and gives a fast, always-available first line of defence.
 * On serverless each instance keeps its own store, so this bounds the rate per
 * instance rather than globally — pair it with a shared check (see
 * `dbRecentSubmissions`) for a limit that holds across instances.
 */
const buckets = new Map<string, Bucket>();
let lastSweep = 0;
const SWEEP_INTERVAL_MS = 60_000;

function sweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** Records a hit against `key` and reports whether it is within `limit` for `windowMs`. */
export function consume(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  return {
    allowed: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds,
  };
}

/** Stable, non-reversible identifier for a client, so raw IPs are never retained. */
function hash(value: string): string {
  const salt = process.env.SESSION_SECRET ?? "amesl-rate-limit";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex").slice(0, 32);
}

/**
 * Best-effort client identity from proxy headers. Returns "unknown" when no
 * usable address is present, which collapses anonymous callers into one shared
 * bucket — deliberately conservative.
 */
export async function clientFingerprint(): Promise<string> {
  let forwarded = "";
  try {
    const h = await headers();
    forwarded =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip")?.trim() ??
      h.get("cf-connecting-ip")?.trim() ??
      "";
  } catch {
    // headers() is unavailable outside a request scope; fall through.
  }
  if (!forwarded) return hash("unknown");
  return hash(forwarded);
}

/** Constant-time string comparison, for comparing secret-ish tokens. */
export function safeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
