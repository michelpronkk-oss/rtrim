import "server-only";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getSupabaseServiceClient } from "@/lib/supabase-server";
import { type AdminRole } from "@/lib/admin-roles";

type TeamMemberRow = {
  id: string;
  role: AdminRole;
  status: string | null;
  user_id?: string | null;
  email?: string | null;
  username?: string | null;
};

function envFallbackRole(): AdminRole {
  const raw = (process.env.RUNTRIM_ADMIN_ROLE ?? "").trim().toLowerCase();
  if (raw === "admin") return "admin";
  if (raw === "content_va") return "content_va";
  if (raw === "analyst") return "analyst";
  return "owner";
}

type AdminResolutionSource = "db_user_id" | "db_email_repaired" | "env_self_healed" | "missing";

type AdminResolution = {
  role: AdminRole | null;
  member: TeamMemberRow | null;
  source: AdminResolutionSource;
  debugSafe: {
    authUserId: string;
    authEmail: string | null;
    matchedBy: "user_id" | "email" | "env" | "none";
  };
};

type ProfileRow = {
  username?: string | null;
};

function parseCsvSet(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean)
  );
}

function getEnvOwnerEmails(): Set<string> {
  const emails = new Set<string>();
  for (const v of parseCsvSet(process.env.RUNTRIM_OWNER_EMAILS)) emails.add(v);
  for (const v of parseCsvSet(process.env.RUNTRIM_ADMIN_USERS)) emails.add(v);
  for (const v of parseCsvSet(process.env.RUNTRIM_ADMIN_USER)) emails.add(v);
  return emails;
}

function getEnvOwnerUsernames(): Set<string> {
  const usernames = new Set<string>();
  for (const v of parseCsvSet(process.env.RUNTRIM_OWNER_USERNAMES)) usernames.add(v);
  for (const v of parseCsvSet(process.env.ADMIN_USERNAMES)) usernames.add(v);
  for (const v of parseCsvSet(process.env.ADMIN_USERNAME)) usernames.add(v);
  const single = (process.env.RUNTRIM_ADMIN_USERNAME ?? "").trim().toLowerCase();
  if (single) usernames.add(single);
  return usernames;
}

async function getUsernamesForUser(
  userId: string,
  userEmail: string | null
): Promise<Set<string>> {
  const out = new Set<string>();
  const emailPrefix = userEmail?.split("@")[0]?.trim().toLowerCase();
  if (emailPrefix) out.add(emailPrefix);

  const user = await getCurrentUser();
  const md = (user?.user_metadata ?? {}) as Record<string, unknown>;
  for (const key of ["username", "user_name", "preferred_username", "display_name"]) {
    const value = typeof md[key] === "string" ? md[key].trim().toLowerCase() : "";
    if (value) out.add(value);
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) return out;

  const { data } = await supabase
    .from("runtrim_profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (data?.username?.trim()) out.add(data.username.trim().toLowerCase());
  return out;
}

async function findActiveMemberByUserId(userId: string): Promise<TeamMemberRow | null> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("admin_team_members")
    .select("id,role,status,user_id,email,username")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle<TeamMemberRow>();
  return data ?? null;
}

async function findActiveMemberByEmail(email: string): Promise<TeamMemberRow | null> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("admin_team_members")
    .select("id,role,status,user_id,email,username")
    .eq("email", email)
    .eq("status", "active")
    .maybeSingle<TeamMemberRow>();
  return data ?? null;
}

async function repairMemberUserId(memberId: string, userId: string): Promise<void> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return;
  await supabase
    .from("admin_team_members")
    .update({ user_id: userId, accepted_at: new Date().toISOString() })
    .eq("id", memberId);
}

async function selfHealFromEnvOwner(
  userId: string,
  email: string | null
): Promise<TeamMemberRow | null> {
  const supabase = getSupabaseServiceClient();
  if (!supabase) return null;

  const envEmails = getEnvOwnerEmails();
  const envUsernames = getEnvOwnerUsernames();
  const usernames = await getUsernamesForUser(userId, email);

  const emailMatch = Boolean(email && envEmails.has(email.toLowerCase()));
  const usernameMatch = [...usernames].some((u) => envUsernames.has(u));
  if (!emailMatch && !usernameMatch) return null;

  const role: AdminRole = envFallbackRole() === "owner" ? "owner" : "admin";
  const username = [...usernames][0] ?? null;

  await supabase.from("admin_team_members").upsert(
    {
      user_id: userId,
      email: email ?? null,
      username,
      display_name: username ?? (email?.split("@")[0] ?? "owner"),
      full_name: username ?? null,
      role,
      status: "active",
      accepted_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  return findActiveMemberByUserId(userId);
}

export async function resolveCurrentAdminMember(): Promise<AdminResolution> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      role: null,
      member: null,
      source: "missing",
      debugSafe: { authUserId: "", authEmail: null, matchedBy: "none" },
    };
  }

  const email = user.email?.trim().toLowerCase() ?? null;
  const directMember = await findActiveMemberByUserId(user.id);
  if (directMember?.role) {
    return {
      role: directMember.role,
      member: directMember,
      source: "db_user_id",
      debugSafe: { authUserId: user.id, authEmail: email, matchedBy: "user_id" },
    };
  }

  if (email) {
    const emailMember = await findActiveMemberByEmail(email);
    if (emailMember?.role) {
      if (!emailMember.user_id || emailMember.user_id !== user.id) {
        await repairMemberUserId(emailMember.id, user.id);
      }
      const repaired = await findActiveMemberByUserId(user.id);
      return {
        role: (repaired?.role ?? emailMember.role) as AdminRole,
        member: repaired ?? emailMember,
        source: "db_email_repaired",
        debugSafe: { authUserId: user.id, authEmail: email, matchedBy: "email" },
      };
    }
  }

  const envMember = await selfHealFromEnvOwner(user.id, email);
  if (envMember?.role) {
    return {
      role: envMember.role,
      member: envMember,
      source: "env_self_healed",
      debugSafe: { authUserId: user.id, authEmail: email, matchedBy: "env" },
    };
  }

  return {
    role: null,
    member: null,
    source: "missing",
    debugSafe: { authUserId: user.id, authEmail: email, matchedBy: "none" },
  };
}

export async function getCurrentAdminRole(): Promise<AdminRole | null> {
  const resolved = await resolveCurrentAdminMember();
  return resolved.role;
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
