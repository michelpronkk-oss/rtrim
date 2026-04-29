"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackWebEvent } from "@/lib/track-client";

const TRACKED_PAGE_PATHS = new Set(["/", "/app/install", "/how-it-works", "/privacy", "/terms", "/security"]);

export function SiteAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !TRACKED_PAGE_PATHS.has(pathname)) return;
    trackWebEvent("page_view", { pagePath: pathname });
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const node = target.closest<HTMLElement>("[data-rt-event]");
      if (!node) return;
      const eventName = node.getAttribute("data-rt-event");
      if (!eventName) return;
      const metadataRaw = node.getAttribute("data-rt-meta");
      let metadata: Record<string, unknown> | undefined = undefined;
      if (metadataRaw) {
        try {
          metadata = JSON.parse(metadataRaw) as Record<string, unknown>;
        } catch {
          metadata = undefined;
        }
      }
      trackWebEvent(eventName, metadata);
    };
    window.addEventListener("click", onClick, { capture: true });
    return () => window.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}

