import type { MetadataRoute } from "next";

const now = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://www.runtrim.com",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://www.runtrim.com/app/install",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: "https://www.runtrim.com/changelog",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://www.runtrim.com/status",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.5,
    },
    {
      url: "https://www.runtrim.com/how-it-works",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: "https://www.runtrim.com/pricing",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: "https://www.runtrim.com/plans",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://www.runtrim.com/claude-code-context-limit",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://www.runtrim.com/ai-coding-continuation-prompts",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://www.runtrim.com/ai-coding-run-history",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://www.runtrim.com/local-first-ai-coding-tool",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://www.runtrim.com/ai-coding-agent-guardrails",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://www.runtrim.com/cursor-context-limit",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://www.runtrim.com/cursor-agent-run-history",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://www.runtrim.com/cursor-agent-guardrails",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://www.runtrim.com/codex-cli-continuation",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://www.runtrim.com/codex-cli-guardrails",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://www.runtrim.com/claude-code-token-waste",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://www.runtrim.com/ai-agent-scope-drift",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://www.runtrim.com/ai-coding-token-waste",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://www.runtrim.com/ai-coding-verification",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://www.runtrim.com/ai-coding-prompt-reuse",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: "https://www.runtrim.com/privacy",
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: "https://www.runtrim.com/terms",
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: "https://www.runtrim.com/security",
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
