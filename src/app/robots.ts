import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/app/install", "/privacy", "/terms", "/security"],
        disallow: [
          "/app/access",
          "/app/runs",
          "/app/projects",
          "/app/settings",
          "/api/",
        ],
      },
    ],
    sitemap: "https://www.runtrim.com/sitemap.xml",
  };
}
