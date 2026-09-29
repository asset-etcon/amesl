import { isMailConfigured, mailConfigError, notifyRecipients, replyToAddress, sendEmail, siteUrl } from "@/lib/mail/resend";
import {
  commentNotificationHtml,
  commentNotificationText,
  quoteConfirmationHtml,
  quoteConfirmationText,
  quoteNotificationHtml,
  quoteNotificationText,
  type CommentEmailData,
  type QuoteEmailData,
} from "@/lib/mail/templates";

export interface CommentNotificationOutcome {
  notified: boolean;
  skipped: boolean;
  errors: string[];
}

/**
 * Alerts the internal recipients that a comment was posted on a news article.
 *
 * Never throws and never rejects: a comment is already visible to the public by
 * the time this runs, so a mail failure must not be surfaced to the commenter as
 * a failed post. There is no customer-facing confirmation — the comment is on the
 * page in front of them already, which is the whole point of publishing
 * immediately.
 *
 * Reuses `QUOTE_NOTIFY_EMAILS` rather than introducing a second recipient
 * variable, so this ships without new required configuration. Split later if
 * comment volume earns its own list.
 */
export async function notifyNewComment(
  comment: CommentEmailData,
  post: { title: string; slug: string },
): Promise<CommentNotificationOutcome> {
  if (!isMailConfigured()) {
    console.error(`[mail] comment ${comment.id} posted but not emailed — ${mailConfigError()}`);
    return { notified: false, skipped: true, errors: [mailConfigError()] };
  }

  const recipients = notifyRecipients();
  if (recipients.length === 0) {
    const error = "QUOTE_NOTIFY_EMAILS is empty or invalid";
    console.error(`[mail] comment ${comment.id} posted but no internal recipient resolved — set QUOTE_NOTIFY_EMAILS`);
    return { notified: false, skipped: true, errors: [error] };
  }

  const url = siteUrl();
  const result = await sendEmail({
    to: recipients,
    subject: `New comment — ${post.title}`,
    html: commentNotificationHtml(comment, post, url),
    text: commentNotificationText(comment, post, url),
    replyTo: replyToAddress(),
    idempotencyKey: `comment-notify-${comment.id}`,
  });

  if (!result.ok) {
    const error = `notification failed: ${result.error ?? "unknown error"}`;
    console.error(`[mail] comment ${comment.id} — ${error}`);
    return { notified: false, skipped: false, errors: [error] };
  }

  return { notified: true, skipped: false, errors: [] };
}

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
