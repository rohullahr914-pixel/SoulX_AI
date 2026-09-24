import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private UI routes emit noindex; crawlers must be able to read it.
        // Authentication, not robots.txt, protects account and admin data.
        disallow: ["/api/", "/api$"],
      },
    ],
    sitemap: "https://soulxai.tech/sitemap.xml",
  };
}
