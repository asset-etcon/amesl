import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { HeroSlideForm } from "@/components/admin/hero-slide-form";

export const metadata = { title: "New hero slide | AMESL Admin" };

export default async function NewHeroSlidePage() {
  await requireRole("homepage");
  return (
    <div>
      <PageHeader title="New hero slide" description="This slide will appear in the homepage hero banner." />
      <HeroSlideForm />
    </div>
  );
}
