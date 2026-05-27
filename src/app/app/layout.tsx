import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { effectivePlanId } from "@/lib/entitlements";
import { AppShell } from "@/components/app/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";

  // Public paths inside /app that don't need auth or AppShell
  const isPublic =
    pathname.startsWith("/app/install") ||
    pathname.startsWith("/app/access");

  if (isPublic) {
    return <>{children}</>;
  }

  // Auth check — middleware is the primary guard, this is defence-in-depth
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Fetch plan
  let plan            = "free";
  let planStatus: string | undefined;
  let hasConnectedCli = false;
  try {
    const supabase = getSupabaseServiceClient();
    if (supabase) {
      const { data } = await supabase
        .from("runtrim_profiles")
        .select("plan, plan_status, current_period_end, cli_token_created_at")
        .eq("id", user.id)
        .maybeSingle();
      if (data) {
        const rawPlan   = (data.plan as string) || "free";
        const rawStatus = (data.plan_status as string | null) ?? null;
        const rawEnd    = (data.current_period_end as string | null) ?? null;
        plan            = effectivePlanId(rawPlan, rawStatus, rawEnd);
        planStatus      = rawStatus ?? undefined;
        hasConnectedCli = !!(data.cli_token_created_at as string | null);
      }
    }
  } catch {
    // Non-fatal — plan defaults to free
  }

  // ── Plan gate: dashboard is a Pro feature ────────────────────────────────
  // Free users only reach /app/billing (upgrade) and /app/trial (checkout).
  // All other dashboard routes require an active Pro/Builder/Team plan.
  const isBillingOrTrial =
    pathname.startsWith("/app/billing") ||
    pathname.startsWith("/app/trial");

  if (plan === "free" && !isBillingOrTrial) {
    redirect("/app/billing");
  }

  return (
    <AppShell userEmail={user.email ?? undefined} plan={plan} planStatus={planStatus} hasConnectedCli={hasConnectedCli}>
      {children}
    </AppShell>
  );
}
