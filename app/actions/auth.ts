"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { profiles } from "@/db/schema";
import {
  assertSessionSecret,
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/session";
import { clientFingerprint, consume } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

/**
 * A real bcrypt hash of a value nobody knows. When the submitted email has no
 * account we still run a comparison against this, so a missing account and a
 * wrong password cost the same wall-clock time and return the same message.
 * Without it, response latency alone tells an attacker which emails are
 * registered.
 */
const TIMING_EQUALIZER_HASH = "$2a$10$.YmMuc0ky4IDSN3RFyl2ven8mAu3TbgiJAzAovJEgathnqwJo0e5y";

/** One message for every failure mode, so the form never confirms an email exists. */
const GENERIC_LOGIN_ERROR = "Invalid email or password.";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
/** Caps password guessing from a single host. */
const LOGIN_MAX_PER_CLIENT = 10;
/**
 * Caps guessing aimed at one account from many hosts. The trade-off is that a
 * determined attacker can lock a known admin out for up to one window; with a
 * small internal team that is an acceptable trade against credential stuffing.
 */
const LOGIN_MAX_PER_EMAIL = 8;

export interface LoginResult {
  error?: string;
}

export async function loginAction(input: { email: string; password: string; redirect?: string }): Promise<LoginResult | never> {
  assertSessionSecret();

  const parsed = loginSchema.safeParse({ email: input.email, password: input.password });
  if (!parsed.success) return { error: "Enter a valid email and password." };

  const email = parsed.data.email.trim().toLowerCase();
  const fingerprint = await clientFingerprint();

  const perClient = consume(`login:client:${fingerprint}`, LOGIN_MAX_PER_CLIENT, LOGIN_WINDOW_MS);
  const perEmail = consume(`login:email:${email}`, LOGIN_MAX_PER_EMAIL, LOGIN_WINDOW_MS);
  if (!perClient.allowed || !perEmail.allowed) {
    const retryAfter = Math.max(perClient.retryAfterSeconds, perEmail.retryAfterSeconds);
    return { error: `Too many attempts. Try again in ${Math.ceil(retryAfter / 60)} minutes.` };
  }

  const rows = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.email, email), eq(profiles.is_deleted, false)))
    .limit(1);

  // Compare against the decoy when there is no account, so both paths pay the
  // same bcrypt cost and the response time does not leak account existence.
  const hash = rows[0]?.password_hash ?? TIMING_EQUALIZER_HASH;
  const matches = await bcrypt.compare(parsed.data.password, hash);
  if (rows.length === 0 || !matches) return { error: GENERIC_LOGIN_ERROR };

  const token = await createSessionToken(rows[0].id);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  const target =
    input.redirect && input.redirect.startsWith("/admin") && input.redirect !== "/admin/login"
      ? input.redirect
      : "/admin";
  redirect(target);
}

export async function signOutAction(): Promise<void> {
  assertSessionSecret();
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
