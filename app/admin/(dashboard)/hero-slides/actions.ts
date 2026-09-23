"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { heroSlides } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { heroSlideSchema } from "@/lib/validators";

export interface HeroSlidePayload {
  id?: string;
  image_desktop: string;
  image_mobile?: string;
  headline: string;
  subtext?: string;
  cta_label?: string;
  cta_href?: string;
  status: "active" | "inactive";
  display_order: number;
}

export async function saveHeroSlideAction(payload: HeroSlidePayload): Promise<{ ok: boolean; error?: string; id?: string }> {
  try {
    const auth = await requireRole("homepage");
    const parsed = heroSlideSchema.safeParse(payload);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return { ok: false, error: first ? first.message : "Invalid slide data." };
    }
    const data = parsed.data;
    const values = {
      image_desktop: data.image_desktop,
      image_mobile: data.image_mobile ?? "",
      headline: data.headline,
      subtext: data.subtext ?? "",
      cta_label: data.cta_label ?? "",
      cta_href: data.cta_href ?? "",
      status: data.status,
      display_order: data.display_order,
    };

    let slideId = payload.id;
    if (payload.id) {
      await db.update(heroSlides).set(values).where(eq(heroSlides.id, payload.id));
    } else {
      const created = await db.insert(heroSlides).values(values).returning({ id: heroSlides.id });
      slideId = created[0].id;
    }

    await logAudit(auth.user, payload.id ? "update" : "create", "hero_slide", slideId, { headline: data.headline });
    revalidatePath("/admin/hero-slides");
    revalidatePath("/", "layout");
    return { ok: true, id: slideId };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Save failed." };
  }
}

export async function deleteHeroSlidesAction(ids: string[]): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = await requireRole("homepage");
    if (!ids.length) return { ok: false, error: "Select at least one slide." };
    await db.delete(heroSlides).where(inArray(heroSlides.id, ids));
    await logAudit(auth.user, "delete", "hero_slide", `[${ids.join(",")}]`);
    revalidatePath("/admin/hero-slides");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Delete failed." };
  }
}

export async function setHeroSlideStatusAction(id: string, status: "active" | "inactive"): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = await requireRole("homepage");
    await db.update(heroSlides).set({ status }).where(eq(heroSlides.id, id));
    await logAudit(auth.user, `set_status_${status}`, "hero_slide", id);
    revalidatePath("/admin/hero-slides");
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Update failed." };
  }
}
