import { requireRole } from "@/lib/auth";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, user } = await requireRole("dashboard");

  return (
    <AdminShell role={profile.role} email={user.email} fullName={profile.full_name}>
      {children}
    </AdminShell>
  );
}
