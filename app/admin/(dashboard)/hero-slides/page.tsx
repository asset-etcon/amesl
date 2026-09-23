import Link from "next/link";
import { Plus } from "lucide-react";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { heroSlides } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { HeroSlideTable, type HeroSlideRow } from "@/components/admin/hero-slide-table";

export const metadata = { title: "Hero slides | AMESL Admin" };

export default async function HeroSlidesPage() {
  const { profile } = await requireRole("homepage");
  const canManage = can(profile.role, "homepage");

  const slides = await db.select().from(heroSlides).orderBy(asc(heroSlides.display_order));

  const rows: HeroSlideRow[] = slides.map((s) => ({
    id: s.id,
    headline: s.headline,
    image: s.image_desktop || s.image_mobile,
    status: s.status === "inactive" ? "inactive" : "active",
    display_order: s.display_order,
  }));

  return (
    <div>
      <PageHeader
        title="Hero slides"
        description="Slides shown in the rotating homepage banner. Active slides appear in display order."
        actions={
          canManage ? (
            <Link href="/admin/hero-slides/new" className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0b1b29] px-4 text-[13.5px] font-bold text-white hover:bg-[#1c4052]">
              <Plus size={16} /> New slide
            </Link>
          ) : undefined
        }
      />
      <HeroSlideTable rows={rows} canManage={canManage} />
    </div>
  );
}
