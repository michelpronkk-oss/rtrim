import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminLogin } from "@/components/admin/admin-login";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { resolveCurrentAdminMember } from "@/lib/admin-roles-server";

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

  const resolved = await resolveCurrentAdminMember();
  if (!resolved.role) {
    return (
      <div className="min-h-screen bg-[#07071A] px-6 py-10 text-[#EDEEFF]">
        <div className="mx-auto max-w-2xl rounded-xl border border-white/10 bg-[#0C0D22] p-6">
          <h1 className="text-[24px] font-semibold">Admin access required</h1>
          <p className="mt-2 text-[13px] text-[#9AA7B6]">
            No active <code>admin_team_members</code> row matched this account.
          </p>
          <div className="mt-4 space-y-1 rounded-lg border border-white/10 bg-black/20 p-3 text-[12px] text-[#A5B4C5]">
            <p>Signed-in email: {resolved.debugSafe.authEmail ?? "(missing)"}</p>
            <p>Signed-in user id: {resolved.debugSafe.authUserId || "(missing)"}</p>
            <p>Matched by: {resolved.debugSafe.matchedBy}</p>
            <p className="pt-1 text-[#9AA7B6]">
              If you are the owner, add this user as owner or configure <code>RUNTRIM_OWNER_EMAILS</code>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <AdminDashboard role={resolved.role} />;
}
