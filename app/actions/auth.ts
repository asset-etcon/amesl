"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { profiles } from "@/db/schema";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/session";

const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export interface LoginResult {
  error?: string;
}

export async function loginAction(input: { email: string; password: string; redirect?: string }): Promise<LoginResult | never> {
  const parsed = loginSchema.safeParse({ email: input.email, password: input.password });
  if (!parsed.success) return { error: "Enter a valid email and password." };

  const email = parsed.data.email.trim().toLowerCase();
  const rows = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.email, email), eq(profiles.is_deleted, false)))
    .limit(1);
  if (rows.length === 0) return { error: "No account matches those details." };

  const matches = await bcrypt.compare(parsed.data.password, rows[0].password_hash);
  if (!matches) return { error: "Invalid email or password." };

  const token = await createSessionToken(rows[0].id);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  const target = input.redirect && input.redirect.startsWith("/admin") && input.redirect !== "/admin/login" ? input.redirect : "/admin";
  redirect(target);
}

export async function signOutAction(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}