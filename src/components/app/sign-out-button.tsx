"use client";

import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12px] text-[#626A94] transition-colors hover:bg-white/5 hover:text-[#C3C6E8]"
    >
      <LogOut className="size-3.5 shrink-0" />
      Sign out
    </button>
  );
}
