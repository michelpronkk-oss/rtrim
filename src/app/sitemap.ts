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
