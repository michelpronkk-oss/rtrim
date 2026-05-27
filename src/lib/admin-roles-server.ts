import "server-only";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { type AdminRole } from "@/lib/admin-roles";

type TeamMemberRow = {
  role: AdminRole;
  status: string | null;
};

function envFallbackRole(): AdminRole {
  const raw = (process.env.RUNTRIM_ADMIN_ROLE ?? "").trim().toLowerCase();
  if (raw === "admin") return "admin";
  if (raw === "content_va") return "content_va";
  if (raw === "analyst") return "analyst";
  return "owner";
}

export async function getCurrentAdminRoleFromDb(): Promise<AdminRole | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = getSupabaseServiceClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("admin_team_members")
    .select("role,status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle<TeamMemberRow>();

  if (!data?.role) return null;
  return data.role;
}

export async function getCurrentAdminRole(): Promise<AdminRole | null> {
  const dbRole = await getCurrentAdminRoleFromDb();
  if (dbRole) return dbRole;

  if (process.env.NODE_ENV !== "production") {
    return envFallbackRole();
  }
  return null;
}

export async function requireAdminRole(
  allowed: AdminRole[] = ["owner", "admin"]
): Promise<{ ok: true; role: AdminRole; userId: string } | { ok: false; status: number; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, status: 401, error: "unauthorized" };

  const role = await getCurrentAdminRole();
  if (!role) return { ok: false, status: 403, error: "forbidden" };
  if (!allowed.includes(role)) return { ok: false, status: 403, error: "forbidden" };

  return { ok: true, role, userId: user.id };
}

