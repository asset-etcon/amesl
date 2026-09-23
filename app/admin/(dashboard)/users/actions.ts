"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isRole } from "@/lib/permissions";
import type { Role } from "@/lib/types";

export interface AddUserInput {
  email: string;
  password: string;
  full_name: string;
  role: Role;
}

export async function addUserAction(input: AddUserInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = await requireRole("users");
    const email = input.email.trim().toLowerCase();
    const fullName = input.full_name.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email address." };
    if (input.password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
    if (fullName.length < 2) return { ok: false, error: "Enter the full name." };
    if (!isRole(input.role)) return { ok: false, error: "Invalid role." };

    const existing = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.email, email)).limit(1);
    if (existing.length) return { ok: false, error: "An account with this email already exists." };

    const passwordHash = await bcrypt.hash(input.password, 10);
    const [created] = await db
      .insert(profiles)
      .values({ email, password_hash: passwordHash, full_name: fullName, role: input.role })
      .returning({ id: profiles.id });
    if (!created) return { ok: false, error: "User could not be created." };

    await logAudit(auth.user, "create", "user", created.id, { email, role: input.role });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not create user." };
  }
}

export async function setUserRoleAction(userId: string, role: Role): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = await requireRole("users");
    if (!isRole(role)) return { ok: false, error: "Invalid role." };

    if (role !== "super_admin") {
      const [saCount] = await db
        .select({ value: count() })
        .from(profiles)
        .where(and(eq(profiles.role, "super_admin"), eq(profiles.is_deleted, false)));
      const [target] = await db
        .select({ role: profiles.role })
        .from(profiles)
        .where(and(eq(profiles.id, userId), eq(profiles.is_deleted, false)))
        .limit(1);
      if (target?.role === "super_admin" && (saCount?.value ?? 0) <= 1) {
        return { ok: false, error: "At least one Super Admin must remain." };
      }
    }

    await db
      .update(profiles)
      .set({ role, updated_at: new Date().toISOString() })
      .where(eq(profiles.id, userId));
    await logAudit(auth.user, `set_role_${role}`, "user", userId);
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Update failed." };
  }
}

export async function deleteUserAction(userId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const auth = await requireRole("users");
    if (userId === auth.user.id) return { ok: false, error: "You cannot delete your own account." };

    const [saCount] = await db
      .select({ value: count() })
      .from(profiles)
      .where(and(eq(profiles.role, "super_admin"), eq(profiles.is_deleted, false)));
    const [target] = await db
      .select({ role: profiles.role })
      .from(profiles)
      .where(and(eq(profiles.id, userId), eq(profiles.is_deleted, false)))
      .limit(1);
    if (target?.role === "super_admin" && (saCount?.value ?? 0) <= 1) {
      return { ok: false, error: "At least one Super Admin must remain." };
    }

    await db
      .update(profiles)
      .set({ is_deleted: true, updated_at: new Date().toISOString() })
      .where(eq(profiles.id, userId));
    await logAudit(auth.user, "delete", "user", userId);
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Delete failed." };
  }
}
