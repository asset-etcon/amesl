import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/db/schema";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";
import { can } from "@/lib/permissions";
import type { Profile } from "@/lib/types";

export interface AuthContext {
  user: { id: string; email: string };
  profile: Profile;
}

/** Resolves the signed-in user id from the session cookie (no DB access). */
export async function currentUserId(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/** Returns the authenticated user id + email, falling back to null. */
export async function getSessionUser(): Promise<{ id: string; email: string } | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const profile = await getProfile(userId);
  return profile ? { id: profile.id, email: profile.email } : null;
}

async function getProfile(userId: string): Promise<Profile | null> {
  const rows = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      full_name: profiles.full_name,
      role: profiles.role,
      created_at: profiles.created_at,
      updated_at: profiles.updated_at,
    })
    .from(profiles)
    .where(and(eq(profiles.id, userId), eq(profiles.is_deleted, false)))
    .limit(1);
  return (rows[0] as unknown as Profile) ?? null;
}

/**
 * Returns an authenticated user with their profile, or redirects to the
 * login page when there is no active session.
 */
export async function requireUser(): Promise<AuthContext> {
  const userId = await currentUserId();
  if (!userId) redirect("/admin/login");

  const profile = await getProfile(userId);
  if (!profile) redirect("/admin/login");

  return { user: { id: profile.id, email: profile.email }, profile };
}

/**
 * Authenticates the caller AND checks they hold the given permission.
 * Redirects to the login page if unauthenticated, or to /admin (dashboard)
 * if authenticated but not permitted.
 */
export async function requireRole(permission: string): Promise<AuthContext> {
  const ctx = await requireUser();
  if (!can(ctx.profile.role, permission)) redirect("/admin");
  return ctx;
}