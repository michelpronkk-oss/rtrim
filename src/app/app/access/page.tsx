import { AppShell } from "@/components/app/app-shell";
import { AppAccessGateCard } from "@/components/app/app-access-gate-card";
import { isAppAccessCodeConfigured, isAppGateBypassed } from "@/lib/app-gate";

interface AppAccessPageProps {
  searchParams?: Promise<{ next?: string }>;
}

export default async function AppAccessPage({ searchParams }: AppAccessPageProps) {
  const accessConfigured = isAppAccessCodeConfigured() || isAppGateBypassed();
  const resolvedParams = searchParams ? await searchParams : {};
  const rawNext = resolvedParams?.next || "/app";
  const nextPath = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/app";

  return (
    <AppShell active="/app">
      <div className="mx-auto w-full max-w-[720px]">
        <AppAccessGateCard accessConfigured={accessConfigured} nextPath={nextPath} />
      </div>
    </AppShell>
  );
}
