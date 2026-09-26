import { formatDateTime } from "@/lib/utils";

const INK = "#0b1b29";
const BODY = "#41515b";
const MUTED = "#65727a";
const BORDER = "#e4e9ea";
const GOLD = "#e7a42b";
const GOLD_DARK = "#bc7d0b";

export interface QuoteEmailData {
  id: string;
  product_name: string;
  brand_name: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  company_name: string;
  message: string;
  quantity: number;
  created_at: string;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const safe = (value: string) => escapeHtml(value ?? "");

/** Wraps content in a table-based shell that renders consistently in email clients. */
function layout(opts: { preheader: string; eyebrow: string; heading: string; intro: string; content: string; cta?: { label: string; url: string }; footnote?: string }): string {
  const { preheader, eyebrow, heading, intro, content, cta, footnote } = opts;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safe(heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f2f4f3;">
<div style="display:none;font-size:1px;line-height:1px;max-height:0;opacity:0;overflow:hidden;">${safe(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f3;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${BORDER};border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<tr><td style="background:${INK};padding:18px 24px;">
<p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${GOLD};">${safe(eyebrow)}</p>
<p style="margin:4px 0 0;font-size:15px;font-weight:800;color:#ffffff;">Asset Matrix Energy</p>
</td></tr>
<tr><td style="padding:24px;">
<h1 style="margin:0;font-size:20px;line-height:1.3;font-weight:800;color:${INK};">${safe(heading)}</h1>
<p style="margin:8px 0 20px;font-size:14px;line-height:1.6;color:${BODY};">${safe(intro)}</p>
${content}
</td></tr>
${
  cta
    ? `<tr><td style="padding:0 24px 24px;"><a href="${safe(cta.url)}" style="display:inline-block;background:${GOLD};color:${INK};font-size:13.5px;font-weight:800;text-decoration:none;padding:11px 20px;border-radius:8px;">${safe(cta.label)}</a></td></tr>`
    : ""
}
<tr><td style="border-top:1px solid ${BORDER};padding:16px 24px;background:#fafbfa;">
<p style="margin:0;font-size:11.5px;line-height:1.6;color:${MUTED};">${footnote ? safe(footnote) : `Asset Matrix Energy · <a href="${safe("mailto:info@assetmatrixenergy.com")}" style="color:${GOLD_DARK};">info@assetmatrixenergy.com</a>`}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function detailRow(label: string, value: string): string {
  return `<tr>
<td style="padding:9px 0;border-bottom:1px solid ${BORDER};font-size:12.5px;font-weight:700;color:${MUTED};width:38%;vertical-align:top;">${safe(label)}</td>
<td style="padding:9px 0;border-bottom:1px solid ${BORDER};font-size:13.5px;color:${INK};vertical-align:top;">${value}</td>
</tr>`;
}

function productLabel(quote: QuoteEmailData): string {
  if (!quote.product_name) return "General enquiry";
  return quote.brand_name ? `${quote.product_name} (${quote.brand_name})` : quote.product_name;
}

/** Internal alert: full request detail plus a shortcut into the admin dashboard. */
export function quoteNotificationHtml(quote: QuoteEmailData, adminUrl: string): string {
  const rows = [
    detailRow("Name", safe(quote.customer_name)),
    detailRow("Email", `<a href="mailto:${safe(quote.customer_email)}" style="color:${GOLD_DARK};">${safe(quote.customer_email)}</a>`),
    quote.customer_phone ? detailRow("Phone", `<a href="tel:${safe(quote.customer_phone.replace(/[^+\d]/g, ""))}" style="color:${GOLD_DARK};">${safe(quote.customer_phone)}</a>`) : "",
    quote.company_name ? detailRow("Company", safe(quote.company_name)) : "",
    detailRow("Product", safe(productLabel(quote))),
    detailRow("Quantity", safe(String(quote.quantity))),
    detailRow("Received", safe(formatDateTime(quote.created_at))),
  ]
    .filter(Boolean)
    .join("");

  const messageBlock = quote.message
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;"><tr><td style="padding:14px;background:#fafbfa;border:1px solid ${BORDER};border-radius:8px;">
<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};">Message</p>
<p style="margin:0;font-size:13.5px;line-height:1.65;color:${BODY};white-space:pre-wrap;">${safe(quote.message)}</p>
</td></tr></table>`
    : "";

  return layout({
    preheader: `New quote request from ${quote.customer_name} for ${productLabel(quote)}`,
    eyebrow: "New quote request",
    heading: `${quote.customer_name} requested a quote`,
    intro: "A customer submitted the quote form on the website. Review the details below and follow up within one business day.",
    content: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>${messageBlock}`,
    cta: { label: "Open in dashboard", url: `${adminUrl.replace(/\/+$/, "")}/admin/quotes/${quote.id}` },
    footnote: `Reference ${quote.id}`,
  });
}

export function quoteNotificationText(quote: QuoteEmailData, adminUrl: string): string {
  const lines = [
    `New quote request from ${quote.customer_name}`,
    "",
    `Name:      ${quote.customer_name}`,
    `Email:     ${quote.customer_email}`,
    quote.customer_phone ? `Phone:     ${quote.customer_phone}` : "",
    quote.company_name ? `Company:   ${quote.company_name}` : "",
    `Product:   ${productLabel(quote)}`,
    `Quantity:  ${quote.quantity}`,
    `Received:  ${formatDateTime(quote.created_at)}`,
    "",
    quote.message ? `Message:\n${quote.message}` : "",
    "",
    `Open in dashboard: ${adminUrl.replace(/\/+$/, "")}/admin/quotes/${quote.id}`,
    `Reference: ${quote.id}`,
  ];
  return lines.filter((l) => l !== "").join("\n");
}

/** Customer-facing acknowledgement. */
export function quoteConfirmationHtml(quote: QuoteEmailData): string {
  const firstName = quote.customer_name.trim().split(/\s+/)[0] || "there";
  const rows = [
    detailRow("Product", safe(productLabel(quote))),
    detailRow("Quantity", safe(String(quote.quantity))),
    detailRow("Submitted", safe(formatDateTime(quote.created_at))),
    detailRow("Reference", safe(quote.id)),
  ].join("");

  const messageBlock = quote.message
    ? `<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:${MUTED};">What you told us</p>
<p style="margin:0;font-size:13.5px;line-height:1.65;color:${BODY};">${safe(quote.message)}</p>`
    : "";

  return layout({
    preheader: `We received your quote request for ${productLabel(quote)}`,
    eyebrow: "Quote request received",
    heading: `Thanks, ${firstName}`,
    intro: "Your request is with our team. A specialist will review the details and come back to you within one business day.",
    content:
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>` +
      (messageBlock
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;"><tr><td style="padding:14px;background:#fafbfa;border:1px solid ${BORDER};border-radius:8px;">${messageBlock}</td></tr></table>`
        : ""),
    footnote: "Reply to this email to reach our team directly.",
  });
}

export function quoteConfirmationText(quote: QuoteEmailData): string {
  const firstName = quote.customer_name.trim().split(/\s+/)[0] || "there";
  return [
    `Thanks, ${firstName}`,
    "",
    "We received your quote request. A specialist will review the details and come back to you within one business day.",
    "",
    `Product:    ${productLabel(quote)}`,
    `Quantity:   ${quote.quantity}`,
    `Submitted:  ${formatDateTime(quote.created_at)}`,
    `Reference:  ${quote.id}`,
    "",
    quote.message ? `What you told us:\n${quote.message}` : "",
    "",
    "Reply to this email to reach our team directly.",
  ]
    .filter((l) => l !== "")
    .join("\n");
}
