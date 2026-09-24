import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  redirects() {
    return [
      { source: "/discover", destination: "/explore", permanent: true },
      { source: "/chat/multi", destination: "/room", permanent: true },
      { source: "/create-persona", destination: "/create", permanent: true },
    ];
  },
};

export default nextConfig;
