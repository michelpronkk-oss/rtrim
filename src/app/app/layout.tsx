import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase-auth-server";
import { getEarlyAccessStatus, eaStatusToPath } from "@/lib/early-access-gate";
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

  // Auth check
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Early access gate (defense in depth — middleware is the primary guard)
  const eaStatus = await getEarlyAccessStatus(user.email);
  if (eaStatus !== "approved") {
    redirect(eaStatusToPath(eaStatus));
  }

  return <AppShell userEmail={user.email ?? undefined}>{children}</AppShell>;
}
