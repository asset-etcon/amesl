import Link from "next/link";
import { and, asc, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { quoteRequests } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { QuoteFilters } from "@/components/admin/quote-filters";
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

function orderByFor(sort: string | undefined): SQL[] {
  switch (sort) {
    case "oldest":
      return [asc(quoteRequests.created_at)];
    case "quantity":
      return [desc(quoteRequests.quantity), desc(quoteRequests.created_at)];
    case "customer":
      return [asc(quoteRequests.customer_name), desc(quoteRequests.created_at)];
    default:
      return [desc(quoteRequests.created_at)];
  }
}

interface SearchParams {
  status?: string;
  q?: string;
  sort?: string;
  view?: string;
  page?: string;
}

export default async function QuotesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  await requireRole("quotes");

  const page = Math.max(1, Number(params.page) || 1);
  const status = (params.status as QuoteStatus) || "";
  const view = params.view ?? "active";
  const from = (page - 1) * PER_PAGE;

  const conditions: SQL[] = [];
  if (status) conditions.push(eq(quoteRequests.status, status));
  if (view !== "all") conditions.push(eq(quoteRequests.archived, view === "archived"));
  const term = (params.q ?? "").trim().slice(0, 120);
  if (term) {
    const like = `%${term}%`;
    conditions.push(
      or(
        ilike(quoteRequests.customer_name, like),
        ilike(quoteRequests.customer_email, like),
        ilike(quoteRequests.company_name, like),
        ilike(quoteRequests.product_name, like)
      )!
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;

  const [quoteRows, totalRows] = await Promise.all([
    db
      .select({
        id: quoteRequests.id,
        customer_name: quoteRequests.customer_name,
        customer_email: quoteRequests.customer_email,
        company_name: quoteRequests.company_name,
        product_name: quoteRequests.product_name,
        brand_name: quoteRequests.brand_name,
        quantity: quoteRequests.quantity,
        status: quoteRequests.status,
        archived: quoteRequests.archived,
        created_at: quoteRequests.created_at,
      })
      .from(quoteRequests)
      .where(where)
      .orderBy(...orderByFor(params.sort))
      .limit(PER_PAGE)
      .offset(from),
    db.select({ value: count() }).from(quoteRequests).where(where),
  ]);

  const total = totalRows[0]?.value ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  const rows: QuoteRow[] = quoteRows.map((q) => ({
    id: q.id,
    customer_name: q.customer_name,
    customer_email: q.customer_email,
    company_name: q.company_name,
    product_name: q.product_name,
    brand_name: q.brand_name,
    quantity: q.quantity,
    status: q.status as QuoteStatus,
    archived: q.archived,
    created_at: q.created_at,
  }));

  const current = { q: params.q, sort: params.sort, view: params.view };
  const hrefFor = (overrides: Record<string, string | undefined>) => {
    const next = { ...current, ...overrides };
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value) search.set(key, value);
    }
    const qs = search.toString();
    return `/admin/quotes${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title="Quote requests"
        description={`${total.toLocaleString()} request${total === 1 ? "" : "s"}${status ? ` with status “${QUOTE_STATUS_LABELS[status]}”` : ""}${term ? ` matching “${term}”` : ""} from the website.`}
      />

      <QuoteFilters current={current} />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {STATUSES.map(({ key, label }) => (
          <Link
            key={key || "all"}
            href={hrefFor({ status: key || undefined })}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors",
              status === key
                ? "bg-[#0b1b29] text-white"
                : "bg-[#e7a42b] text-[#172633] hover:bg-[#f3bb4e]"
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      <QuoteTable rows={rows} page={page} pageCount={pageCount} total={total} query={{ ...current, status: params.status }} />
    </div>
  );
}
