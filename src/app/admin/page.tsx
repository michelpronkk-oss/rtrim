import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminLogin } from "@/components/admin/admin-login";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getCurrentAdminRole } from "@/lib/admin-roles-server";

export const runtime = "nodejs";
export const metadata = {
  title: "RunTrim Admin",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) return <AdminLogin />;

  const role = await getCurrentAdminRole();
  if (!role) {
    return (
      <div className="min-h-screen bg-[#07071A] px-6 py-10 text-[#EDEEFF]">
        <div className="mx-auto max-w-2xl rounded-xl border border-white/10 bg-[#0C0D22] p-6">
          <h1 className="text-[24px] font-semibold">Admin access required</h1>
          <p className="mt-2 text-[13px] text-[#9AA7B6]">
            Your account is signed in but does not have an active admin team membership.
          </p>
        </div>
      </div>
    );
  }

  return <AdminDashboard role={role} />;
}
