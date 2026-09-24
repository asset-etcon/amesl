import { count, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { media } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { MediaUploader } from "@/components/admin/media-uploader";
import { MediaGrid, type MediaRow } from "@/components/admin/media-grid";

export const metadata = { title: "Media library | AMESL Admin" };

const PER_PAGE = 40;

interface SearchParams {
  page?: string;
}

export default async function MediaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const { profile } = await requireRole("media");
  const canManage = can(profile.role, "media");

  const page = Math.max(1, Number(params.page) || 1);
  const offset = (page - 1) * PER_PAGE;

  const [countRows, data] = await Promise.all([
    db.select({ value: count() }).from(media),
    db.select().from(media).orderBy(desc(media.created_at)).limit(PER_PAGE).offset(offset),
  ]);

  const rows: MediaRow[] = data.map((m) => ({
    id: m.id,
    name: m.name,
    url: m.url,
    file_type: m.file_type,
    size_bytes: m.size_bytes,
    width: m.width,
    height: m.height,
    created_at: m.created_at,
  }));

  const total = countRows[0]?.value ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div>
      <PageHeader
        title="Media library"
        description={`${total} file${total === 1 ? "" : "s"} available. Images (JPG/PNG/WEBP, max 5 MB) and PDFs (max 10 MB) only.`}
        actions={canManage ? <MediaUploader /> : undefined}
      />

      <MediaGrid rows={rows} />

      {pageCount > 1 && (
        <div className="mt-5 flex items-center justify-end gap-2">
          {page > 1 && (
            <a href={`/admin/media?page=${page - 1}`} className="rounded-lg border border-[#e7a42b] bg-[#e7a42b] px-3 py-1.5 text-[12.5px] font-bold text-[#172633]">
              Prev
            </a>
          )}
          <span className="text-[12.5px] text-[#65727a]">Page {page} of {pageCount}</span>
          {page < pageCount && (
            <a href={`/admin/media?page=${page + 1}`} className="rounded-lg border border-[#e7a42b] bg-[#e7a42b] px-3 py-1.5 text-[12.5px] font-bold text-[#172633]">
              Next
            </a>
          )}
        </div>
      )}
    </div>
  );
}
