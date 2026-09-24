import Link from "next/link";
import { ArrowRight, BookOpen, History, MessageSquare, Package, Plus } from "lucide-react";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, brands, categories, products, quoteRequests } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { Badge, Card, PageHeader, quoteStatusTone } from "@/components/admin/ui";
import { QUOTE_STATUS_LABELS, type Product, type QuoteRequest } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export const metadata = { title: "Dashboard | AMESL Admin" };

export default async function DashboardPage() {
  const { profile } = await requireRole("dashboard");

  const [
    totalProducts,
    publishedProducts,
    draftProducts,
    archivedProducts,
    featuredProducts,
    newQuotes,
    totalQuotes,
    brandsCount,
    categoriesCount,
    recentQuotes,
    recentProducts,
    recentAudits,
  ] = await Promise.all([
    db.select({ value: count() }).from(products),
    db.select({ value: count() }).from(products).where(eq(products.status, "published")),
    db.select({ value: count() }).from(products).where(eq(products.status, "draft")),
    db.select({ value: count() }).from(products).where(eq(products.status, "archived")),
    db.select({ value: count() }).from(products).where(eq(products.featured, true)),
    db.select({ value: count() }).from(quoteRequests).where(and(eq(quoteRequests.status, "new"), eq(quoteRequests.archived, false))),
    db.select({ value: count() }).from(quoteRequests),
    db.select({ value: count() }).from(brands).where(eq(brands.status, "active")),
    db.select({ value: count() }).from(categories).where(eq(categories.status, "active")),
    db.select().from(quoteRequests).orderBy(desc(quoteRequests.created_at)).limit(5),
    db.select().from(products).orderBy(desc(products.updated_at)).limit(5),
    db.select().from(auditLogs).orderBy(desc(auditLogs.created_at)).limit(8),
  ]);

  const value = (rows: { value: number }[]) => rows[0]?.value ?? 0;
  const quotes = recentQuotes as QuoteRequest[];
  const recent = recentProducts as Product[];
  const activity = recentAudits;

  const stats = [
    { label: "Total products", value: value(totalProducts), href: "/admin/products", icon: Package },
    { label: "Published", value: value(publishedProducts), href: "/admin/products?status=published" },
    { label: "Drafts", value: value(draftProducts), href: "/admin/products?status=draft" },
    { label: "Archived", value: value(archivedProducts), href: "/admin/products?status=archived" },
    { label: "Featured", value: value(featuredProducts), href: "/admin/products?featured=true" },
    { label: "New quotes", value: value(newQuotes), href: "/admin/quotes?status=new" },
    { label: "Total quotes", value: value(totalQuotes), href: "/admin/quotes" },
    { label: "Brands", value: value(brandsCount), href: "/admin/brands" },
    { label: "Categories", value: value(categoriesCount), href: "/admin/categories" },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Welcome back${profile.full_name ? `, ${profile.full_name}` : ""}. Here is what is happening across your catalogue.`}
        actions={
          <Link href="/admin/products/new" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#e7a42b] px-4 text-[13.5px] font-bold text-[#172633] hover:bg-[#f3bb4e]">
            <Plus size={16} /> New product
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(({ label, value: statValue, href, icon: Icon }) => (
          <Link key={label} href={href} className="group">
            <Card className="flex h-full items-start justify-between p-4 transition-shadow group-hover:shadow-md">
              <div>
                <p className="text-[26px] font-extrabold leading-8 text-[#0b1b29]">{statValue.toLocaleString()}</p>
                <p className="text-[12px] font-semibold text-[#65727a]">{label}</p>
              </div>
              {Icon && <Icon size={17} className="mt-0.5 text-[#c3ccd0]" />}
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between border-b border-[#eef1f0] px-5 py-4">
            <h2 className="flex items-center gap-2 text-[14.5px] font-extrabold text-[#0b1b29]">
              <MessageSquare size={16} className="text-[#e7a42b]" /> Latest quote requests
            </h2>
            <Link href="/admin/quotes" className="flex items-center gap-1 text-[12px] font-bold text-[#bc7d0b] hover:underline">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          {quotes.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-[#8a969c]">No quote requests yet.</p>
          ) : (
            <ul className="divide-y divide-[#f0f2f1]">
              {quotes.map((q) => (
                <li key={q.id}>
                  <Link href={`/admin/quotes/${q.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-[#fafbfa]">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-bold text-[#152431]">{q.customer_name}</p>
                      <p className="truncate text-[12px] text-[#65727a]">
                        {q.product_name || "General enquiry"} · {timeAgo(q.created_at)}
                      </p>
                    </div>
                    <Badge tone={quoteStatusTone[q.status]}>{QUOTE_STATUS_LABELS[q.status]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b border-[#eef1f0] px-5 py-4">
            <h2 className="flex items-center gap-2 text-[14.5px] font-extrabold text-[#0b1b29]">
              <BookOpen size={16} className="text-[#e7a42b]" /> Recently updated products
            </h2>
            <Link href="/admin/products" className="flex items-center gap-1 text-[12px] font-bold text-[#bc7d0b] hover:underline">
              View all <ArrowRight size={13} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="px-5 py-8 text-center text-[13px] text-[#8a969c]">
              No products yet.{" "}
              <Link href="/admin/products/new" className="font-bold text-[#bc7d0b] hover:underline">
                Create your first product
              </Link>
            </p>
          ) : (
            <ul className="divide-y divide-[#f0f2f1]">
              {recent.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/products/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-[#fafbfa]">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-bold text-[#152431]">{p.name}</p>
                      <p className="text-[12px] text-[#65727a]">Updated {timeAgo(p.updated_at)}</p>
                    </div>
                    <Badge tone={p.status === "published" ? "green" : p.status === "draft" ? "gray" : "amber"}>{p.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6">
        <div className="flex items-center justify-between border-b border-[#eef1f0] px-5 py-4">
          <h2 className="flex items-center gap-2 text-[14.5px] font-extrabold text-[#0b1b29]">
            <History size={16} className="text-[#e7a42b]" /> Recent activity
          </h2>
        </div>
        {activity.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-[#8a969c]">No activity recorded yet.</p>
        ) : (
          <ul className="divide-y divide-[#f0f2f1]">
            {activity.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-bold text-[#152431]">{entry.user_email || "System"}</p>
                  <p className="truncate text-[12px] text-[#65727a]">
                    {entry.action} · {entry.resource}
                  </p>
                </div>
                <span className="shrink-0 text-[11.5px] text-[#8a969c]">{timeAgo(entry.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
