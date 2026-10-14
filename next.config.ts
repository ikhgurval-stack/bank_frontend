import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: { root: process.cwd() },
  async rewrites() {
    const backend = (
      process.env.BACKEND_URL || "http://localhost:8080"
    ).replace(/\/$/, "");
    return [
      { source: "/api/v1/:path*", destination: `${backend}/api/v1/:path*` },
    ];
  },
};
export default nextConfig;
