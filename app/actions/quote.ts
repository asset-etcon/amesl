"use server";

import { db } from "@/lib/db";
import { quoteRequests } from "@/db/schema";
import { quoteSchema } from "@/lib/validators";

export interface QuoteSubmitInput {
  product_id?: string | null;
  product_name: string;
  brand_name: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  company_name?: string;
  message?: string;
  quantity: number;
}

export async function submitQuoteAction(input: QuoteSubmitInput): Promise<{ ok: boolean; error?: string }> {
  const parsed = quoteSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first ? first.message : "Please complete the form." };
  }
  const data = parsed.data;
  try {
    await db.insert(quoteRequests).values({
      product_id: data.product_id || null,
      product_name: data.product_name,
      brand_name: data.brand_name,
      customer_name: data.customer_name,
      customer_email: data.customer_email,
      customer_phone: data.customer_phone ?? "",
      company_name: data.company_name ?? "",
      message: data.message ?? "",
      quantity: data.quantity,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not submit your request. Please try again." };
  }
}