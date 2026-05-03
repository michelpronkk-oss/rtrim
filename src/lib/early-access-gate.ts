import "server-only";
import { getSupabaseServiceClient } from "./supabase-server";

export type EarlyAccessStatus = "approved" | "pending" | "rejected" | "none";

export function eaStatusToPath(status: EarlyAccessStatus): string {
  if (status === "pending")  return "/access/pending";
  if (status === "rejected") return "/access/rejected";
  return "/access/request";
}

export async function getEarlyAccessStatus(
  email: string | null | undefined
): Promise<EarlyAccessStatus> {
  if (!email) return "none";

  // Dev / gate-disabled bypass
  if (
    process.env.NODE_ENV !== "production" ||
    process.env.RUNTRIM_DISABLE_EA_GATE === "true"
  ) {
    return "approved";
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) return "approved"; // DB not configured — allow through

  const { data } = await supabase
    .from("runtrim_early_access")
    .select("status")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  const s = (data?.status as string) ?? "none";
  if (s === "approved") return "approved";
  if (s === "pending")  return "pending";
  if (s === "rejected") return "rejected";
  return "none";
}
