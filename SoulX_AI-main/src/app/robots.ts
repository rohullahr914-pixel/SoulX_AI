import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/explore", "/persona/", "/about", "/community", "/pricing", "/room"],
        disallow: [
          "/admin/",
          "/api/",
          "/chat/",
          "/favorites",
          "/login",
          "/profile",
          "/reset-password",
          "/settings",
          "/signup",
        ],
      },
    ],
    sitemap: "https://soulxai.tech/sitemap.xml",
  };
}
