import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { siteSettings } from "@/db/schema";
import { whatsappHref } from "@/lib/whatsapp";

/** Deduped per request, so a page with several CTAs runs one query. */
const readWhatsappNumber = cache(async (): Promise<string> => {
  try {
    const rows = await db.select({ value: siteSettings.value }).from(siteSettings).where(eq(siteSettings.key, "whatsapp_number"));
    return rows[0]?.value ?? "";
  } catch {
    return "";
  }
});

interface WhatsappLinkProps {
  message: string;
  fallbackHref: string;
  className?: string;
  children: React.ReactNode;
}

export async function WhatsappLink({ message, fallbackHref, className, children }: WhatsappLinkProps) {
  const number = await readWhatsappNumber();
  return (
    <a className={className} href={whatsappHref(number, message, fallbackHref)} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
