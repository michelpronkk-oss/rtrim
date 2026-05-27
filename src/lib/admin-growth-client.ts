"use client";

type GrowthResource = "posts" | "assets" | "replies" | "approvals" | "daily-logs";

export async function growthList<T = Record<string, unknown>>(resource: GrowthResource): Promise<T[]> {
  const res = await fetch(`/api/admin/growth/${resource}`, { cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.ok) return [];
  return (body.rows ?? []) as T[];
}

export async function growthCreate<T = Record<string, unknown>>(resource: GrowthResource, row: Record<string, unknown>): Promise<T | null> {
  const res = await fetch(`/api/admin/growth/${resource}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ row }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.ok) return null;
  return body.row as T;
}

export async function growthUpdate<T = Record<string, unknown>>(resource: GrowthResource, id: string, patch: Record<string, unknown>): Promise<T | null> {
  const res = await fetch(`/api/admin/growth/${resource}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id, patch }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body?.ok) return null;
  return body.row as T;
}

export async function growthDelete(resource: GrowthResource, id: string): Promise<boolean> {
  const res = await fetch(`/api/admin/growth/${resource}`, {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id }),
  });
  const body = await res.json().catch(() => ({}));
  return Boolean(res.ok && body?.ok);
}

