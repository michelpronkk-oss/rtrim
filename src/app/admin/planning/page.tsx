import { AdminPlanningDashboard } from "@/components/admin/admin-planning-dashboard";
import { AdminLogin } from "@/components/admin/admin-login";
import { getAdminConfig, hasValidAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const metadata = {
  title: "RunTrim Admin Planning",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminPlanningPage() {
  const cfg = getAdminConfig();
  const hasSession = await hasValidAdminSession();

  if (!cfg.configured && cfg.isProduction) {
    return (
      <div className="min-h-screen bg-[#07071A] px-6 py-10 text-[#EDEEFF]">
        <div className="mx-auto max-w-2xl rounded-xl border border-white/10 bg-[#0C0D22] p-6">
          <h1 className="text-[24px] font-semibold">Admin access is not configured.</h1>
          <p className="mt-2 text-[13px] text-[#9AA7B6]">
            Set RUNTRIM_ADMIN_USERNAME, RUNTRIM_ADMIN_PASSWORD and RUNTRIM_ADMIN_SESSION_SECRET.
          </p>
        </div>
      </div>
    );
  }

  if (!cfg.configured && !cfg.isProduction) {
    return (
      <div className="min-h-screen bg-[#07071A] px-6 py-10 text-[#EDEEFF]">
        <div className="mx-auto max-w-2xl rounded-xl border border-white/10 bg-[#0C0D22] p-6">
          <h1 className="text-[24px] font-semibold">Admin access is not configured.</h1>
          <p className="mt-2 text-[13px] text-[#9AA7B6]">
            Development setup warning: set RUNTRIM_ADMIN_USERNAME, RUNTRIM_ADMIN_PASSWORD and RUNTRIM_ADMIN_SESSION_SECRET to enable login.
          </p>
        </div>
      </div>
    );
  }

  if (!hasSession) return <AdminLogin />;

  return <AdminPlanningDashboard />;
}
