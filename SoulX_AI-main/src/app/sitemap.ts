import type { MetadataRoute } from "next";
import { getPersonas } from "@/lib/personas";

const siteUrl = "https://soulxai.tech";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicPages = [
    { path: "", priority: 1, changeFrequency: "weekly" as const },
    { path: "/explore", priority: 0.9, changeFrequency: "daily" as const },
    { path: "/about", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/community", priority: 0.7, changeFrequency: "daily" as const },
    { path: "/pricing", priority: 0.6, changeFrequency: "monthly" as const },
    { path: "/room", priority: 0.7, changeFrequency: "weekly" as const },
  ];

  return [
    ...publicPages.map(({ path, priority, changeFrequency }) => ({
      url: `${siteUrl}${path}`,
      priority,
      changeFrequency,
    })),
    ...getPersonas()
      .filter((persona) => persona.visibility === "Public" && persona.creatorId === "system")
      .map((persona) => ({
        url: `${siteUrl}/persona/${persona.slug}`,
        priority: persona.isFeatured ? 0.8 : 0.6,
        changeFrequency: "monthly" as const,
      })),
  ];
}
