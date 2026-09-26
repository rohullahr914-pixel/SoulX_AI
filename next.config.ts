import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/(.*)\\.(svg|png|jpg|jpeg|webp|avif|gif|ico|woff|woff2)",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, must-revalidate" }],
      },
    ];
  },
  redirects() {
    return [
      { source: "/community/persona/:slug", destination: "/persona/:slug", permanent: true },
      { source: "/discover", destination: "/explore", permanent: true },
      { source: "/chat/multi", destination: "/room", permanent: true },
      { source: "/create-persona", destination: "/create", permanent: true },
    ];
  },
};

export default nextConfig;
