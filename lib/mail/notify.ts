import { isMailConfigured, mailConfigError, notifyRecipients, replyToAddress, sendEmail, siteUrl } from "@/lib/mail/resend";
import { quoteConfirmationHtml, quoteConfirmationText, quoteNotificationHtml, quoteNotificationText, type QuoteEmailData } from "@/lib/mail/templates";

export interface QuoteNotificationOutcome {
  notified: boolean;
  confirmed: boolean;
  skipped: boolean;
  errors: string[];
}

/**
 * Sends the internal alert and the customer acknowledgement for a new quote
 * request. Never throws and never rejects: a quote that is safely stored must
 * not be reported to the customer as a failed submission just because email
 * is unavailable. Failures are logged for the operator to act on.
 */
export async function notifyNewQuote(quote: QuoteEmailData): Promise<QuoteNotificationOutcome> {
  const errors: string[] = [];

  if (!isMailConfigured()) {
    console.error(`[mail] quote ${quote.id} stored but not emailed — ${mailConfigError()}`);
    return { notified: false, confirmed: false, skipped: true, errors: [mailConfigError()] };
  }

  const recipients = notifyRecipients();
  if (recipients.length === 0) {
    const error = "QUOTE_NOTIFY_EMAILS is empty or invalid";
    console.error(`[mail] quote ${quote.id} stored but no internal recipient resolved — set QUOTE_NOTIFY_EMAILS`);
    return { notified: false, confirmed: false, skipped: true, errors: [error] };
  }

  const adminUrl = siteUrl();
  const subject = `New quote request — ${quote.customer_name}${quote.product_name ? ` · ${quote.product_name}` : ""}`;

  const [internal, customer] = await Promise.allSettled([
    sendEmail({
      to: recipients,
      subject,
      html: quoteNotificationHtml(quote, adminUrl),
      text: quoteNotificationText(quote, adminUrl),
      idempotencyKey: `quote-notify-${quote.id}`,
    }),
    sendEmail({
      to: quote.customer_email,
      subject: `We received your quote request${quote.product_name ? ` — ${quote.product_name}` : ""}`,
      html: quoteConfirmationHtml(quote),
      text: quoteConfirmationText(quote),
      replyTo: replyToAddress(),
      idempotencyKey: `quote-confirm-${quote.id}`,
    }),
  ]);

  const read = (settled: PromiseSettledResult<{ ok: boolean; error?: string }>) =>
    settled.status === "fulfilled" ? settled.value : { ok: false, error: settled.reason instanceof Error ? settled.reason.message : "Unexpected error" };

  const internalResult = read(internal);
  const customerResult = read(customer);

  if (!internalResult.ok) {
    const error = `internal notification failed: ${internalResult.error ?? "unknown error"}`;
    console.error(`[mail] quote ${quote.id} — ${error}`);
    errors.push(error);
  }
  if (!customerResult.ok) {
    const error = `customer confirmation failed: ${customerResult.error ?? "unknown error"}`;
    console.error(`[mail] quote ${quote.id} — ${error}`);
    errors.push(error);
  }

  return {
    notified: internalResult.ok,
    confirmed: customerResult.ok,
    skipped: false,
    errors,
  };
}
