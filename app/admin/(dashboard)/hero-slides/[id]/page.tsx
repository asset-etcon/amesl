import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { heroSlides } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { HeroSlideForm } from "@/components/admin/hero-slide-form";

export const metadata = { title: "Edit hero slide | AMESL Admin" };

export default async function EditHeroSlidePage({ params }: { params: Promise<{ id: string }> }) {
  const { profile } = await requireRole("homepage");
  const canManage = can(profile.role, "homepage");
  const { id } = await params;

  const found = await db.select().from(heroSlides).where(eq(heroSlides.id, id)).limit(1);
  const slide = found[0];
  if (!slide) notFound();

  return (
    <div>
      <PageHeader title="Edit hero slide" description="Update the headline, image or button action." />
      {canManage ? (
        <HeroSlideForm
          slide={{
            id: slide.id,
            image_desktop: slide.image_desktop,
            image_mobile: slide.image_mobile,
            headline: slide.headline,
            subtext: slide.subtext,
            cta_label: slide.cta_label,
            cta_href: slide.cta_href,
            status: slide.status === "inactive" ? "inactive" : "active",
            display_order: slide.display_order,
          }}
        />
      ) : (
        <p className="rounded-xl border border-[#e4e9ea] bg-white p-5 text-[13.5px] text-[#65727a]">You have view-only access to the homepage.</p>
      )}
    </div>
  );
}
