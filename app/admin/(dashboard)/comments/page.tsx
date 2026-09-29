import Link from "next/link";
import { and, asc, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { newsPosts, postComments } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { CommentFilters } from "@/components/admin/comment-filters";
import { CommentTable, type CommentRow } from "@/components/admin/comment-table";
import { cn } from "@/lib/utils";

export const metadata = { title: "Comments | AMESL Admin" };

const PER_PAGE = 20;
const STATUSES: Array<{ key: string; label: string }> = [
  { key: "", label: "All" },
  { key: "published", label: "Published" },
  { key: "hidden", label: "Hidden" },
];

function orderByFor(sort: string | undefined): SQL[] {
  switch (sort) {
    case "oldest":
      return [asc(postComments.created_at)];
    case "author":
      return [asc(postComments.author_name), desc(postComments.created_at)];
    case "article":
      return [asc(newsPosts.title), desc(postComments.created_at)];
    default:
      return [desc(postComments.created_at)];
  }
}

interface SearchParams {
  status?: string;
  q?: string;
  sort?: string;
  page?: string;
}

export default async function CommentsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const { profile } = await requireRole("comments");
  // Read permission shows the queue; only the manage capability gets the
  // hide/delete buttons, matching how the quotes and labels screens split.
  const canManage = can(profile.role, "comments_manage");

  const page = Math.max(1, Number(params.page) || 1);
  const status = params.status ?? "";
  const from = (page - 1) * PER_PAGE;

  const conditions: SQL[] = [];
  if (status) conditions.push(eq(postComments.status, status));
  const term = (params.q ?? "").trim().slice(0, 120);
  if (term) {
    const like = `%${term}%`;
    conditions.push(
      or(
        ilike(postComments.author_name, like),
        ilike(postComments.author_email, like),
        ilike(postComments.body, like),
        ilike(newsPosts.title, like)
      )!
    );
  }
  const where = conditions.length ? and(...conditions) : undefined;

  // The list and the count must share the same from/join/where, including the
  // news_posts join the article-title search needs, or the page count is wrong.
  const from_comments = db
    .select({
      id: postComments.id,
      author_name: postComments.author_name,
      author_email: postComments.author_email,
      body: postComments.body,
      status: postComments.status,
      created_at: postComments.created_at,
      post_title: newsPosts.title,
      post_slug: newsPosts.slug,
    })
    .from(postComments)
    .innerJoin(newsPosts, eq(postComments.post_id, newsPosts.id));

  const [commentRows, totalRows, hiddenRows] = await Promise.all([
    from_comments.where(where).orderBy(...orderByFor(params.sort)).limit(PER_PAGE).offset(from),
    db
      .select({ value: count() })
      .from(postComments)
      .innerJoin(newsPosts, eq(postComments.post_id, newsPosts.id))
      .where(where),
    db.select({ value: count() }).from(postComments).where(eq(postComments.status, "hidden")),
  ]);

  const total = totalRows[0]?.value ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const hidden = hiddenRows[0]?.value ?? 0;

  const rows: CommentRow[] = commentRows.map((c) => ({
    id: c.id,
    author_name: c.author_name,
    author_email: c.author_email,
    body: c.body,
    status: c.status === "hidden" ? "hidden" : "published",
    created_at: c.created_at,
    post_title: c.post_title,
    post_slug: c.post_slug,
  }));

  const current = { q: params.q, sort: params.sort };
  const hrefFor = (overrides: Record<string, string | undefined>) => {
    const next = { ...current, ...overrides };
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value) search.set(key, value);
    }
    const qs = search.toString();
    return `/admin/comments${qs ? `?${qs}` : ""}`;
  };

  return (
    <div>
      <PageHeader
        title="Comments"
        description={`${total.toLocaleString()} comment${total === 1 ? "" : "s"}${status ? ` with status “${status}”` : ""}${term ? ` matching “${term}”` : ""}. Comments publish immediately, so hiding one here removes it from the article.`}
      />

      <CommentFilters current={current} />

      <div className="mb-4 flex flex-wrap gap-1.5">
        {STATUSES.map(({ key, label }) => (
          <Link
            key={key || "all"}
            href={hrefFor({ status: key || undefined })}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-colors",
              status === key ? "bg-[#0b1b29] text-white" : "bg-[#e7a42b] text-[#172633] hover:bg-[#f3bb4e]"
            )}
          >
            {label}
            {key === "hidden" && hidden > 0 ? ` ${hidden}` : ""}
          </Link>
        ))}
      </div>

      <CommentTable rows={rows} page={page} pageCount={pageCount} total={total} canManage={canManage} query={{ ...current, status }} />
    </div>
  );
}
