import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, MessageSquareText, Phone } from "lucide-react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { brands, products, quoteRequests } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { Badge, Card, PageHeader, quoteStatusTone } from "@/components/admin/ui";
import { QuoteDetailControls } from "@/components/admin/quote-detail-controls";
import { QUOTE_STATUS_LABELS, type QuoteStatus } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export const metadata = { title: "Quote request | AMESL Admin" };

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requireRole("quotes");
  const canManage = can(profile.role, "quotes_manage");
  const { id } = await params;

  const found = await db
    .select({
      id: quoteRequests.id,
      product_id: quoteRequests.product_id,
      product_name: quoteRequests.product_name,
      brand_name: quoteRequests.brand_name,
      customer_name: quoteRequests.customer_name,
      customer_email: quoteRequests.customer_email,
      customer_phone: quoteRequests.customer_phone,
      company_name: quoteRequests.company_name,
      message: quoteRequests.message,
      quantity: quoteRequests.quantity,
      status: quoteRequests.status,
      internal_notes: quoteRequests.internal_notes,
      created_at: quoteRequests.created_at,
      product_slug: products.slug,
      brand_slug: brands.slug,
    })
    .from(quoteRequests)
    .leftJoin(products, eq(products.id, quoteRequests.product_id))
    .leftJoin(brands, eq(brands.id, products.brand_id))
    .where(eq(quoteRequests.id, id))
    .limit(1);

  const quote = found[0];
  if (!quote) notFound();

  const productSlug = quote.product_slug;
  const brandSlug = quote.brand_slug;

  return (
    <div>
      <PageHeader
        title="Quote request"
        description={`Received ${formatDateTime(quote.created_at)}`}
        actions={
          <Badge tone={quoteStatusTone[quote.status as QuoteStatus]}>{QUOTE_STATUS_LABELS[quote.status as QuoteStatus]}</Badge>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-[14.5px] font-extrabold text-[#0b1b29]">Customer</h2>
            <div className="mt-3 space-y-2.5">
              <p className="text-[14px] font-bold text-[#152431]">{quote.customer_name}</p>
              {quote.company_name && <p className="text-[12.5px] text-[#65727a]">{quote.company_name}</p>}
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href={`mailto:${quote.customer_email}?subject=${encodeURIComponent(`Quote request — ${quote.product_name || "General enquiry"}`)}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#d7dee0] px-3 py-1.5 text-[12px] font-bold text-[#41515b] hover:border-[#0b1b29]"
                >
                  <Mail size={13} /> {quote.customer_email}
                </a>
                {quote.customer_phone && (
                  <a
                    href={`tel:${quote.customer_phone.replace(/[^+\d]/g, "")}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#d7dee0] px-3 py-1.5 text-[12px] font-bold text-[#41515b] hover:border-[#0b1b29]"
                  >
                    <Phone size={13} /> {quote.customer_phone}
                  </a>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-[14.5px] font-extrabold text-[#0b1b29]">Requested product</h2>
            <div className="mt-3">
              {quote.product_name ? (
                <>
                  <p className="text-[14px] font-bold text-[#152431]">{quote.product_name}</p>
                  {quote.brand_name && <p className="text-[12.5px] text-[#65727a]">{quote.brand_name} · Quantity {quote.quantity}</p>}
                  {brandSlug && productSlug && (
                    <Link
                      href={`/products/${brandSlug}/${productSlug}`}
                      className="mt-2 inline-flex text-[12px] font-bold text-[#bc7d0b] hover:underline"
                    >
                      View product on site
                    </Link>
                  )}
                </>
              ) : (
                <p className="text-[13px] text-[#8a969c]">General enquiry — no specific product.</p>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="flex items-center gap-2 text-[14.5px] font-extrabold text-[#0b1b29]">
              <MessageSquareText size={16} className="text-[#e7a42b]" /> Message
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-[13.5px] leading-6 text-[#41515b]">{quote.message || "No message provided."}</p>
          </Card>
        </div>

        <QuoteDetailControls id={quote.id} initialStatus={quote.status as QuoteStatus} initialNotes={quote.internal_notes} canManage={canManage} />
      </div>
    </div>
  );
}