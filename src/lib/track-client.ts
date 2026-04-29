"use client";

type EventPayload = {
  eventName: string;
  source?: "web" | "cli";
  anonymousId?: string;
  sessionId?: string;
  pagePath?: string;
  referrer?: string;
  metadata?: Record<string, unknown>;
};

function idFromStorage(key: string, factory: () => string, session = false): string {
  if (typeof window === "undefined") return "";
  const store = session ? window.sessionStorage : window.localStorage;
  let value = store.getItem(key);
  if (!value) {
    value = factory();
    store.setItem(key, value);
  }
  return value;
}

function randomId(prefix: string): string {
  const raw = Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `${prefix}_${raw.slice(0, 14)}`;
}

export function getWebAnonymousId(): string {
  return idFromStorage("runtrim_web_anonymous_id", () => randomId("anon"));
}

export function getWebSessionId(): string {
  return idFromStorage("runtrim_web_session_id", () => randomId("sess"), true);
}

export async function trackWebEvent(eventName: string, metadata?: Record<string, unknown>): Promise<void> {
  if (typeof window === "undefined") return;
  const payload: EventPayload = {
    eventName,
    source: "web",
    anonymousId: getWebAnonymousId(),
    sessionId: getWebSessionId(),
    pagePath: window.location.pathname,
    referrer: document.referrer || "",
    metadata,
  };
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // noop
  }
}

