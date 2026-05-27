export type AdminRole = "owner" | "admin" | "content_va" | "analyst";

export type TabId =
  | "overview"
  | "growth"
  | "content"
  | "assets"
  | "replies"
  | "approvals"
  | "analytics-lite"
  | "checklist"
  | "team"
  | "activity"
  | "planning";

export function getAdminRole(): AdminRole {
  const raw = (process.env.RUNTRIM_ADMIN_ROLE ?? "").trim().toLowerCase();
  if (raw === "admin") return "admin";
  if (raw === "content_va") return "content_va";
  if (raw === "analyst") return "analyst";
  return "owner";
}

export function getRoleLabel(role: AdminRole): string {
  const labels: Record<AdminRole, string> = {
    owner: "Owner",
    admin: "Admin",
    content_va: "Content VA",
    analyst: "Analyst",
  };
  return labels[role] ?? "Owner";
}

export function getDefaultTab(role: AdminRole): TabId {
  if (role === "content_va") return "growth";
  return "overview";
}

export function getTabsForRole(role: AdminRole): { id: TabId; label: string }[] {
  const ALL: { id: TabId; label: string }[] = [
    { id: "overview",       label: "Overview"    },
    { id: "growth",         label: "Growth Ops"  },
    { id: "content",        label: "Content"     },
    { id: "assets",         label: "Assets"      },
    { id: "replies",        label: "Replies"     },
    { id: "approvals",      label: "Approvals"   },
    { id: "analytics-lite", label: "Analytics"   },
    { id: "checklist",      label: "Checklist"   },
    { id: "team",           label: "Team"        },
    { id: "activity",       label: "Activity"    },
    { id: "planning",       label: "Planning"    },
  ];

  const visible: Record<AdminRole, TabId[]> = {
    owner:      ["overview", "growth", "content", "assets", "replies", "approvals", "team", "activity", "planning"],
    admin:      ["overview", "growth", "content", "assets", "replies", "approvals", "team", "activity", "planning"],
    content_va: ["growth", "content", "assets", "replies", "checklist", "analytics-lite"],
    analyst:    ["analytics-lite"],
  };

  const allowed = new Set(visible[role] ?? visible.owner);
  return ALL.filter((t) => allowed.has(t.id));
}
