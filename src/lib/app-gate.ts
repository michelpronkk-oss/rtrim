export const APP_ACCESS_COOKIE = "runtrim_app_access";

export function isAppGateBypassed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.RUNTRIM_DISABLE_APP_GATE === "true";
}

export function getConfiguredAppAccessCode(): string {
  return process.env.RUNTRIM_APP_ACCESS_CODE?.trim() || "";
}

export function isAppAccessCodeConfigured(): boolean {
  return getConfiguredAppAccessCode().length > 0;
}
