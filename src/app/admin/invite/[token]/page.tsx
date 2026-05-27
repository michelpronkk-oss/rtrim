"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

type InviteState = "loading" | "invalid" | "expired" | "ready" | "accepted";

export default function AdminInviteAcceptPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = String(params.token ?? "");

  const [state, setState] = useState<InviteState>("loading");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [authed, setAuthed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [country, setCountry] = useState("");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const validate = await fetch("/api/admin/invite/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const validateBody = await validate.json().catch(() => ({}));
      if (!mounted) return;

      if (!validate.ok || !validateBody?.ok) {
        if (validateBody?.state === "expired") setState("expired");
        else setState("invalid");
        return;
      }

      setInviteEmail(validateBody.invite?.email ?? "");
      setInviteRole(validateBody.invite?.role ?? "");

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setAuthed(Boolean(data?.user));
      setState("ready");
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/invite/accept", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, fullName, birthDate, country, timezone, phone }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !body?.ok) {
      setError(body?.error ?? "Could not accept invite.");
      return;
    }
    setState("accepted");
    setTimeout(() => router.push("/admin"), 800);
  }

  return (
    <div className="min-h-screen bg-[#08090b] text-[#f4f5f7]">
      <div className="mx-auto max-w-2xl px-6 py-14">
        <div className="rounded-[12px] border border-white/10 bg-[#0c0e11] p-6 sm:p-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#a78bfa]">RunTrim Team Invite</p>
          {state === "loading" && <p className="mt-4 text-[14px] text-[#8a8f98]">Validating invite...</p>}
          {state === "invalid" && <p className="mt-4 text-[14px] text-[#f87171]">This invite is invalid or already used.</p>}
          {state === "expired" && <p className="mt-4 text-[14px] text-[#f5a524]">This invite has expired. Ask an owner/admin to resend.</p>}
          {state === "accepted" && <p className="mt-4 text-[14px] text-[#6ee7b7]">Invite accepted. Redirecting to admin...</p>}

          {state === "ready" && (
            <>
              <h1 className="mt-3 text-[30px] font-semibold tracking-[-0.03em] text-[#f4f5f7]">Accept your RunTrim invite</h1>
              <p className="mt-3 text-[14px] leading-7 text-[#9aa7b6]">
                You were invited as <strong className="text-[#f4f5f7]">{inviteRole}</strong> for <strong className="text-[#f4f5f7]">{inviteEmail}</strong>.
              </p>

              {!authed ? (
                <div className="mt-6 rounded-[8px] border border-white/10 bg-[#090b0e] p-4">
                  <p className="text-[13px] text-[#c9ccd2]">Sign in first to continue invite onboarding.</p>
                  <div className="mt-3">
                    <Link
                      href={`/login?next=${encodeURIComponent(`/admin/invite/${token}`)}`}
                      className="inline-flex h-9 items-center rounded-[7px] border border-white bg-[#f4f5f7] px-4 text-[13px] font-medium text-[#0b0d10]"
                    >
                      Sign in to continue
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="mt-6 grid gap-3">
                  <input className="h-10 rounded-[7px] border border-white/12 bg-[#111317] px-3 text-[13px]" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  <input className="h-10 rounded-[7px] border border-white/12 bg-[#111317] px-3 text-[13px]" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                  <input className="h-10 rounded-[7px] border border-white/12 bg-[#111317] px-3 text-[13px]" placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} required />
                  <input className="h-10 rounded-[7px] border border-white/12 bg-[#111317] px-3 text-[13px]" placeholder="Timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} required />
                  <input className="h-10 rounded-[7px] border border-white/12 bg-[#111317] px-3 text-[13px]" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  {error ? <p className="text-[12px] text-[#f87171]">{error}</p> : null}
                  <button
                    disabled={busy}
                    className="mt-1 inline-flex h-10 items-center justify-center rounded-[7px] border border-white bg-[#f4f5f7] px-4 text-[13px] font-medium text-[#0b0d10] disabled:opacity-60"
                  >
                    {busy ? "Accepting..." : "Accept invite"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

