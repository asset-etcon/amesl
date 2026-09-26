"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { quoteRequests } from "@/db/schema";
import { QUOTE_MAX_FILL_MS, QUOTE_MIN_FILL_MS, quoteSchema } from "@/lib/validators";
import { clientFingerprint, consume } from "@/lib/rate-limit";
import { notifyNewQuote } from "@/lib/mail/notify";
import type { QuoteEmailData } from "@/lib/mail/templates";

export interface QuoteSubmitInput {
  product_id?: string | null;
  product_name: string;
  brand_name: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  company_name?: string;
  message?: string;
  quantity: number;
  website?: string;
  started_at?: number;
}

/** Submissions allowed per client per hour, shared across all server instances. */
const MAX_PER_HOUR = 5;
/** Submissions allowed per client per day. */
const MAX_PER_DAY = 12;
/** In-process burst guard, applied before any database work. */
const MAX_PER_MINUTE = 3;

const REJECTED = "We could not accept this request right now. Please try again in a little while.";

/**
 * Counts recent submissions for this client. Returns null when the shared check
 * is unavailable (for example the `submitter_hash` column has not been added
 * yet) so the caller can fall back to the per-process limit instead of failing
 * every legitimate submission.
 */
async function recentSubmissions(submitterHash: string): Promise<{ hour: number; day: number } | null> {
  try {
    const [rows] = await Promise.all([
      db
        .select({
          hour: sql<number>`count(*) filter (where ${quoteRequests.created_at} >= now() - interval '1 hour')::int`,
          day: sql<number>`count(*)::int`,
        })
        .from(quoteRequests)
        .where(and(eq(quoteRequests.submitter_hash, submitterHash), gte(quoteRequests.created_at, sql`now() - interval '24 hours'`))),
    ]);
    const row = rows[0];
    return row ? { hour: row.hour, day: row.day } : null;
  } catch {
    return null;
  }
}

export async function submitQuoteAction(input: QuoteSubmitInput): Promise<{ ok: boolean; error?: string }> {
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first ? first.message : "Please complete the form." };
  }
  const data = parsed.data;

  // Honeypot: a real user never sees this field, so anything in it is a bot.
  // Report success rather than an error so the bot learns nothing.
  if (data.website) {
    console.warn(`[quote] honeypot triggered (${data.website.length} chars) — submission discarded`);
    return { ok: true };
  }

  // Timing: a genuine customer cannot complete the form in under a few seconds.
  if (data.started_at !== undefined) {
    const elapsed = Date.now() - data.started_at;
    if (elapsed >= 0 && elapsed < QUOTE_MIN_FILL_MS) {
      console.warn(`[quote] rejected submission completed in ${elapsed}ms — likely automated`);
      return { ok: false, error: REJECTED };
    }
    if (elapsed > QUOTE_MAX_FILL_MS) {
      console.warn(`[quote] rejected submission with a stale form (${Math.round(elapsed / 1000)}s old)`);
      return { ok: false, error: REJECTED };
    }
  }

  const submitterHash = await clientFingerprint();

  const burst = consume(`quote:burst:${submitterHash}`, MAX_PER_MINUTE, 60_000);
  if (!burst.allowed) {
    console.warn(`[quote] rate limit hit (burst) for ${submitterHash.slice(0, 8)}…`);
    return { ok: false, error: REJECTED };
  }

  const recent = await recentSubmissions(submitterHash);
  if (recent && (recent.hour >= MAX_PER_HOUR || recent.day >= MAX_PER_DAY)) {
    console.warn(`[quote] rate limit hit (${recent.hour}/hr, ${recent.day}/day) for ${submitterHash.slice(0, 8)}…`);
    return { ok: false, error: REJECTED };
  }

  let stored: QuoteEmailData;
  try {
    const inserted = await db
      .insert(quoteRequests)
      .values({
        product_id: data.product_id || null,
        product_name: data.product_name,
        brand_name: data.brand_name,
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone ?? "",
        company_name: data.company_name ?? "",
        message: data.message ?? "",
        quantity: data.quantity,
        submitter_hash: submitterHash,
      })
      .returning({
        id: quoteRequests.id,
        product_name: quoteRequests.product_name,
        brand_name: quoteRequests.brand_name,
        customer_name: quoteRequests.customer_name,
        customer_email: quoteRequests.customer_email,
        customer_phone: quoteRequests.customer_phone,
        company_name: quoteRequests.company_name,
        message: quoteRequests.message,
        quantity: quoteRequests.quantity,
        created_at: quoteRequests.created_at,
      });

    const row = inserted[0];
    if (!row) return { ok: false, error: "Could not submit your request. Please try again." };
    stored = row;
  } catch {
    return { ok: false, error: "Could not submit your request. Please try again." };
  }

  // The request is durably stored at this point. Email is best-effort: a mail
  // outage must not be reported to the customer as a failed submission, and the
  // admin dashboard remains the system of record.
  try {
    await notifyNewQuote(stored);
  } catch (err) {
    console.error(`[mail] quote ${stored.id} stored but notification threw unexpectedly`, err);
  }

  return { ok: true };
}
