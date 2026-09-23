import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { isRole } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { UsersTable, type UserRow } from "@/components/admin/users-table";
import type { Role } from "@/lib/types";

export const metadata = { title: "Users & roles | AMESL Admin" };

export default async function UsersPage() {
  const { user } = await requireRole("users");

  const rows = await db
    .select()
    .from(profiles)
    .where(eq(profiles.is_deleted, false))
    .orderBy(desc(profiles.created_at));

  const items: UserRow[] = rows.map((p) => ({
    id: p.id,
    email: p.email,
    full_name: p.full_name,
    role: isRole(p.role) ? (p.role as Role) : "sales",
    created_at: p.created_at,
  }));

  return (
    <div>
      <PageHeader
        title="Users & roles"
        description={`${items.length} account${items.length === 1 ? "" : "s"} with dashboard access. Roles control which sections each user can view or manage.`}
      />
      <UsersTable rows={items} currentUserId={user.id} />
    </div>
  );
}
