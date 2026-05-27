"use client";

import { useEffect, useState } from "react";

type Member = {
  id: string;
  email: string;
  username?: string | null;
  display_name?: string | null;
  full_name?: string | null;
  role: "owner" | "admin" | "content_va" | "analyst";
  status: "active" | "invited" | "disabled";
  invited_at?: string | null;
  accepted_at?: string | null;
};

export function AdminTeamContent() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "content_va" | "analyst">("content_va");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/team", { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok || !body?.ok) {
      setError(body?.error ?? "Could not load team.");
      return;
    }
    setMembers(body.members ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/team", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, role, note }),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !body?.ok) {
      setError(body?.error ?? "Could not send invite.");
      return;
    }
    setEmail("");
    setNote("");
    await load();
  }

  async function patchMember(id: string, patch: Record<string, string>) {
    const res = await fetch(`/api/admin/team/member/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) await load();
  }

  async function resendInvite(id: string) {
    const res = await fetch(`/api/admin/team/invite/${id}/resend`, { method: "POST" });
    if (res.ok) await load();
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-[10px] border border-white/10 bg-[#0c0e11] p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5a5f68]">Team invites</p>
        <form onSubmit={sendInvite} className="mt-3 grid gap-3 sm:grid-cols-4">
          <input value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email" className="h-9 rounded-[7px] border border-white/12 bg-[#111317] px-3 text-[13px] text-[#f4f5f7] sm:col-span-2" />
          <select value={role} onChange={(e) => setRole(e.target.value as "admin" | "content_va" | "analyst")} className="h-9 rounded-[7px] border border-white/12 bg-[#111317] px-3 text-[13px] text-[#f4f5f7]">
            <option value="content_va">content_va</option>
            <option value="analyst">analyst</option>
            <option value="admin">admin</option>
          </select>
          <button disabled={busy} className="h-9 rounded-[7px] border border-white bg-[#f4f5f7] px-3 text-[13px] font-medium text-[#0b0d10] disabled:opacity-60">
            {busy ? "Sending..." : "Send invite"}
          </button>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" className="h-9 rounded-[7px] border border-white/12 bg-[#111317] px-3 text-[13px] text-[#f4f5f7] sm:col-span-4" />
        </form>
        {error ? <p className="mt-2 text-[12px] text-[#f87171]">{error}</p> : null}
      </div>

      <div className="rounded-[10px] border border-white/10 bg-[#0c0e11] p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#5a5f68]">Members</p>
        {loading ? (
          <p className="mt-3 text-[12px] text-[#8a8f98]">Loading team...</p>
        ) : (
          <div className="mt-3 grid gap-2">
            {members.map((m) => (
              <div key={m.id} className="rounded-[8px] border border-white/8 bg-[#090b0e] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] text-[#f4f5f7]">{m.display_name || m.full_name || m.username || m.email}</p>
                  <span className="font-mono text-[10px] text-[#8a8f98]">{m.role}</span>
                  <span className="font-mono text-[10px] text-[#8a8f98]">{m.status}</span>
                </div>
                <p className="mt-1 text-[12px] text-[#8a8f98]">{m.email}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {m.status === "invited" && (
                    <button onClick={() => resendInvite(m.id)} className="h-7 rounded-[6px] border border-white/12 px-2 text-[11px] text-[#c9ccd2]">Resend invite</button>
                  )}
                  {m.status !== "disabled" && (
                    <button onClick={() => patchMember(m.id, { status: "disabled" })} className="h-7 rounded-[6px] border border-white/12 px-2 text-[11px] text-[#c9ccd2]">Disable</button>
                  )}
                  <button onClick={() => patchMember(m.id, { role: "content_va" })} className="h-7 rounded-[6px] border border-white/12 px-2 text-[11px] text-[#c9ccd2]">Set VA</button>
                  <button onClick={() => patchMember(m.id, { role: "analyst" })} className="h-7 rounded-[6px] border border-white/12 px-2 text-[11px] text-[#c9ccd2]">Set Analyst</button>
                  <button onClick={() => patchMember(m.id, { role: "admin" })} className="h-7 rounded-[6px] border border-white/12 px-2 text-[11px] text-[#c9ccd2]">Set Admin</button>
                </div>
              </div>
            ))}
            {members.length === 0 ? <p className="text-[12px] text-[#8a8f98]">No team members yet.</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}

