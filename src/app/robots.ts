import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/app/install",
          "/how-it-works",
          "/pricing",
          "/plans",
          "/changelog",
          "/security",
          "/privacy",
          "/terms",
          "/claude-code-context-limit",
          "/ai-coding-continuation-prompts",
          "/ai-coding-run-history",
          "/local-first-ai-coding-tool",
          "/ai-coding-agent-guardrails",
          "/cursor-context-limit",
          "/cursor-agent-run-history",
          "/cursor-agent-guardrails",
          "/codex-cli-continuation",
          "/codex-cli-guardrails",
          "/claude-code-token-waste",
          "/ai-agent-scope-drift",
          "/ai-coding-token-waste",
          "/ai-coding-verification",
          "/ai-coding-prompt-reuse",
        ],
        disallow: [
          "/app/access",
          "/app/runs",
          "/app/projects",
          "/app/settings",
          "/api/",
          "/admin",
        ],
      },
    ],
    sitemap: "https://www.runtrim.com/sitemap.xml",
  };
}
