import Link from "next/link";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { quoteRequests } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { QuoteTable, type QuoteRow } from "@/components/admin/quote-table";
import { QUOTE_STATUS_LABELS, type QuoteStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Quote requests | AMESL Admin" };

const PER_PAGE = 20;
const STATUSES: Array<{ key: QuoteStatus | ""; label: string }> = [
  { key: "", label: "All" },
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "quotation_sent", label: "Quotation sent" },
  { key: "negotiating", label: "Negotiating" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

interface SearchParams {
  status?: string;
  page?: string;
}

export default async function QuotesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  await requireRole("quotes");

  const page = Math.max(1, Number(params.page) || 1);
  const status = (params.status as QuoteStatus) || "";
  const from = (page - 1) * PER_PAGE;

  const conditions = [];
  if (status) conditions.push(eq(quoteRequests.status, status));

  const [quoteRows, totalRows] = await Promise.all([
    db
      .select({
        id: quoteRequests.id,
        customer_name: quoteRequests.customer_name,
        customer_email: quoteRequests.customer_email,
        product_name: quoteRequests.product_name,
        brand_name: quoteRequests.brand_name,
        quantity: quoteRequests.quantity,
        status: quoteRequests.status,
        archived: quoteRequests.archived,
        created_at: quoteRequests.created_at,
      })
      .from(quoteRequests)
      .where(and(...conditions))
      .orderBy(desc(quoteRequests.created_at))
      .limit(PER_PAGE)
      .offset(from),
    db.select({ value: count() }).from(quoteRequests).where(and(...conditions)),
  ]);

  const total = totalRows[0]?.value ?? 0;

  const rows: QuoteRow[] = quoteRows.map((q) => ({
    id: q.id,
    customer_name: q.customer_name,
    customer_email: q.customer_email,
    product_name: q.product_name,
    brand_name: q.brand_name,
    quantity: q.quantity,
    status: q.status as QuoteStatus,
    archived: q.archived,
    created_at: q.created_at,
  }));

  return (
    <div>
      <PageHeader
        title="Quote requests"
        description={`${total.toLocaleString()} request${total === 1 ? "" : "s"}${status ? ` with status “${QUOTE_STATUS_LABELS[status]}”` : ""} from the website.`}
      />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {STATUSES.map(({ key, label }) => (
          <Link
            key={key || "all"}
            href={key ? `/admin/quotes?status=${key}` : "/admin/quotes"}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors",
              status === key ? "bg-[#0b1b29] text-white" : "bg-white text-[#41515b] hover:bg-[#e9eeed]"
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      <QuoteTable rows={rows} />

      {rows.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-[12.5px] text-[#65727a]">Page {page}</p>
          {page > 1 && (
            <Link href={`/admin/quotes?${new URLSearchParams({ ...(status && { status }), page: String(page - 1) })}`} className="rounded-lg border border-[#d7dee0] bg-white px-2.5 py-1 text-[12.5px] font-bold text-[#41515b]">
              Prev
            </Link>
          )}
        </div>
      )}
    </div>
  );
}