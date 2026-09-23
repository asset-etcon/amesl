import { requireRole } from "@/lib/auth";
import { Sidebar } from "@/components/admin/sidebar";
import { Topbar } from "@/components/admin/topbar";
import { ToastProvider } from "@/components/admin/ui";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profile, user } = await requireRole("dashboard");

  return (
    <div className="flex min-h-screen bg-[#f4f6f5]">
      <Sidebar role={profile.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar email={user.email} role={profile.role} fullName={profile.full_name} />
        <main className="flex-1 px-6 py-6 lg:px-8 lg:py-8">
          <ToastProvider>{children}</ToastProvider>
        </main>
      </div>
    </div>
  );
}