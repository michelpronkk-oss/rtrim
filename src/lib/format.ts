export function formatRisk(risk: string): string {
  const map: Record<string, string> = {
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
    none: "None",
  };
  return map[risk] ?? risk;
}

export function formatStatus(status: string): string {
  const map: Record<string, string> = {
    passed: "Passed",
    partial: "Partial",
    needs_verification: "Needs Verification",
    drift_detected: "Drift Detected",
    guarded: "Guarded",
    checked: "Checked",
    completed: "Completed",
    blocked: "Blocked",
    split_required: "Split Required",
    executed: "Executed",
  };
  return map[status] ?? status;
}

export function formatScore(score: number): string {
  return `${score}/100`;
}

export function truncate(text: string, maxLen = 60): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
