"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Clock, FolderKanban } from "lucide-react";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
};

type RunResult = {
  id: string;
  task: string;
  verdict: string | null;
  agent: string | null;
  created_at: string;
  project_id: string | null;
};

type ProjectResult = {
  id: string;
  name: string;
  last_status: string | null;
  updated_at: string;
};

function verdictColor(v: string | null) {
  if (v === "pass")    return "#6ee7b7";
  if (v === "blocked") return "#f87171";
  if (v === "warn")    return "#f5a524";
  return "#5a5f68";
}

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const router   = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query,    setQuery]    = useState("");
  const [runs,     setRuns]     = useState<RunResult[]>([]);
  const [projects, setProjects] = useState<ProjectResult[]>([]);
  const [loading,  setLoading]  = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    setQuery("");
    setRuns([]);
    setProjects([]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      reset();
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open, reset]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query || query.length < 2) {
      setRuns([]);
      setProjects([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.ok) {
          setRuns(data.runs ?? []);
          setProjects(data.projects ?? []);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const hasResults = runs.length > 0 || projects.length > 0;
  const isEmpty    = query.length >= 2 && !loading && !hasResults;

  function goRun(id: string) {
    router.push(`/app/runs/${id}`);
    onClose();
  }

  function goProject(id: string) {
    router.push(`/app/runs?project=${id}`);
    onClose();
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: "12vh",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(600px, calc(100vw - 32px))",
          background: "#0c0e11",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input row */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Search size={14} style={{ color: "#5a5f68", flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search runs, projects, agents..."
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              ...MONO,
              fontSize: 13,
              color: "#f4f5f7",
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              style={{ background: "none", border: "none", color: "#5a5f68", cursor: "pointer", display: "flex", padding: 2 }}
            >
              <X size={13} />
            </button>
          )}
          <span style={{ ...MONO, fontSize: 10, padding: "1px 6px", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 3, color: "#3a3e46" }}>
            esc
          </span>
        </div>

        {/* Results */}
        {(hasResults || loading || isEmpty) && (
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {loading && (
              <div style={{ padding: "24px 16px", textAlign: "center", ...MONO, fontSize: 12, color: "#3a3e46" }}>
                Searching...
              </div>
            )}

            {!loading && isEmpty && (
              <div style={{ padding: "24px 16px", textAlign: "center", ...MONO, fontSize: 12, color: "#3a3e46" }}>
                No results for &ldquo;{query}&rdquo;
              </div>
            )}

            {!loading && projects.length > 0 && (
              <div>
                <div style={{ padding: "8px 16px 4px", ...MONO, fontSize: 10, color: "#3a3e46", letterSpacing: "0.10em", textTransform: "uppercase" }}>
                  Projects
                </div>
                {projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => goProject(p.id)}
                    style={{
                      width: "100%", textAlign: "left", background: "none", border: "none",
                      cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 16px",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      transition: "background 0.1s",
                    }}
                    className="hover:bg-white/[0.03]"
                  >
                    <FolderKanban size={13} style={{ color: "#a78bfa", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "#f4f5f7", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name}
                    </span>
                    {p.last_status && (
                      <span style={{ ...MONO, fontSize: 10, color: verdictColor(p.last_status), flexShrink: 0 }}>
                        {p.last_status}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {!loading && runs.length > 0 && (
              <div>
                <div style={{ padding: "8px 16px 4px", ...MONO, fontSize: 10, color: "#3a3e46", letterSpacing: "0.10em", textTransform: "uppercase" }}>
                  Runs
                </div>
                {runs.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => goRun(r.id)}
                    style={{
                      width: "100%", textAlign: "left", background: "none", border: "none",
                      cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "10px 16px",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      transition: "background 0.1s",
                    }}
                    className="hover:bg-white/[0.03]"
                  >
                    <Clock size={12} style={{ color: "#5a5f68", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "#f4f5f7", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.task ?? "Untitled run"}
                    </span>
                    <span style={{ ...MONO, fontSize: 10, color: verdictColor(r.verdict), flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {r.verdict ?? "pending"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer hint */}
        {!hasResults && !loading && query.length < 2 && (
          <div style={{ padding: "16px", display: "flex", gap: 16, ...MONO, fontSize: 11, color: "#3a3e46" }}>
            <span>Type to search runs and projects</span>
          </div>
        )}
      </div>
    </div>
  );
}
