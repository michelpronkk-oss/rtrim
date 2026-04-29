import crypto from "crypto";
import { cookies } from "next/headers";

export const ADMIN_SESSION_COOKIE = "runtrim_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function getAdminConfig() {
  const username = process.env.RUNTRIM_ADMIN_USERNAME?.trim() ?? "";
  const password = process.env.RUNTRIM_ADMIN_PASSWORD?.trim() ?? "";
  const sessionSecret = process.env.RUNTRIM_ADMIN_SESSION_SECRET?.trim() ?? "";
  const isProduction = process.env.NODE_ENV === "production";
  return {
    username,
    password,
    sessionSecret,
    isProduction,
    configured: Boolean(username && password && sessionSecret),
  };
}

function base64url(input: Buffer | string): string {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf-8");
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64url(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const paddingNeeded = (4 - (padded.length % 4)) % 4;
  const withPadding = padded + "=".repeat(paddingNeeded);
  return Buffer.from(withPadding, "base64").toString("utf-8");
}

function sign(value: string, secret: string): string {
  return base64url(crypto.createHmac("sha256", secret).update(value).digest());
}

function safeEq(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

export function createAdminSessionValue(username: string, secret: string): string {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = JSON.stringify({
    v: 1,
    username,
    issuedAt,
    expiresAt,
  });
  const encoded = base64url(payload);
  const sig = sign(encoded, secret);
  return `${encoded}.${sig}`;
}

export function verifyAdminSessionValue(
  value: string | undefined | null,
  secret: string
): boolean {
  if (!value || !secret) return false;
  const [encoded, signature] = value.split(".");
  if (!encoded || !signature) return false;
  const expected = sign(encoded, secret);
  if (!safeEq(signature, expected)) return false;
  try {
    const parsed = JSON.parse(fromBase64url(encoded)) as { username?: string; expiresAt?: number };
    if (!parsed.username || typeof parsed.username !== "string") return false;
    if (!parsed.expiresAt || Date.now() > parsed.expiresAt) return false;
    return true;
  } catch {
    return false;
  }
}

export async function hasValidAdminSession(): Promise<boolean> {
  const config = getAdminConfig();
  if (!config.configured) return false;
  const jar = await cookies();
  const raw = jar.get(ADMIN_SESSION_COOKIE)?.value;
  return verifyAdminSessionValue(raw, config.sessionSecret);
}

export function getSessionMaxAgeSeconds(): number {
  return SESSION_MAX_AGE_SECONDS;
}
