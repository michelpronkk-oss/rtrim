export function normalizeTaskText(task: string): string {
  const lower = task.toLowerCase().trim();
  const strippedSuffix = lower
    .replace(/,?\s*check everything\b/g, "")
    .replace(/,?\s*make sure billing works\b/g, "");
  return strippedSuffix
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type AttemptMeta = {
  key: string;
  attempts: number;
  attemptNumber: number;
  latestAttempt: boolean;
  repeatedTask: boolean;
};

export function buildAttemptMeta<T extends { task: string }>(runs: T[]): AttemptMeta[] {
  const bucket = new Map<string, number[]>();
  for (let i = 0; i < runs.length; i += 1) {
    const key = normalizeTaskText(runs[i].task || "untitled run") || "untitled run";
    const existing = bucket.get(key) ?? [];
    existing.push(i);
    bucket.set(key, existing);
  }

  return runs.map((run, index) => {
    const key = normalizeTaskText(run.task || "untitled run") || "untitled run";
    const indices = bucket.get(key) ?? [index];
    const rank = indices.indexOf(index);
    const attempts = indices.length;
    const attemptNumber = Math.max(1, attempts - rank);
    return {
      key,
      attempts,
      attemptNumber,
      latestAttempt: rank === 0,
      repeatedTask: attempts > 1,
    };
  });
}
