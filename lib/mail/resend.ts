const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 8000;

export interface SendResult {
  ok: boolean;
  error?: string;
  id?: string;
}

const apiKey = () => process.env.RESEND_API_KEY ?? "";
const fromEmail = () => (process.env.MAIL_FROM_EMAIL ?? "").trim();
const fromName = () => (process.env.MAIL_FROM_NAME ?? "Asset Matrix Energy").trim();

/** Absolute site origin, used for links inside emails. */
export function siteUrl(): string {
  const explicit = process.env.SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/+$/, "")}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/+$/, "")}`;
  if (process.env.NODE_ENV !== "production") return "http://localhost:3000";
  return "";
}

/** Comma-separated recipient list for internal notifications. Invalid entries are dropped. */
export function notifyRecipients(): string[] {
  const raw = process.env.QUOTE_NOTIFY_EMAILS ?? "";
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const value = part.trim().toLowerCase();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) seen.add(value);
  }
  return [...seen];
}

/** Reply-to for customer-facing mail, so replies land in the shared company inbox. */
export function replyToAddress(): string | undefined {
  const value = process.env.MAIL_REPLY_TO_EMAIL?.trim();
  return value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : undefined;
}

export function isMailConfigured(): boolean {
  return Boolean(apiKey()) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail());
}

export function mailConfigError(): string {
  const missing: string[] = [];
  if (!apiKey()) missing.push("RESEND_API_KEY");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail())) missing.push("MAIL_FROM_EMAIL");
  return missing.length
    ? `Email is not configured. Set ${missing.join(", ")} in .env.local and restart.`
    : "Email is not configured.";
}

interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  /** Prevents duplicate sends if a submission is retried. */
  idempotencyKey?: string;
}

/**
 * Sends a transactional email through Resend. Never throws — callers are
 * notification paths where a failure must not break the primary operation.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendResult> {
  if (!isMailConfigured()) return { ok: false, error: mailConfigError() };

  const to = Array.isArray(input.to) ? input.to : [input.to];
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey()}`,
    "Content-Type": "application/json",
  };
  if (input.idempotencyKey) headers["Idempotency-Key"] = input.idempotencyKey;

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      body: JSON.stringify({
        from: `${fromName()} <${fromEmail()}>`,
        to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });

    const payload = (await res.json().catch(() => null)) as { id?: string; message?: string; name?: string } | null;

    if (!res.ok) {
      return { ok: false, error: `Resend ${res.status}: ${payload?.message ?? "request failed"}` };
    }
    return { ok: true, id: payload?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Request failed." };
  }
}
