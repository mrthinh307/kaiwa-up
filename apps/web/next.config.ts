import type { NextConfig } from "next";

import path from "node:path";

const apiBaseUrl = process.env.API_BASE_URL?.replace(/\/$/, "");

if (process.env.VERCEL === "1" && !apiBaseUrl) {
  throw new Error("API_BASE_URL must be configured for Vercel deployments");
}

const nextConfig: NextConfig = {
  async rewrites() {
    return apiBaseUrl
      ? [
          {
            destination: `${apiBaseUrl}/api/:path*`,
            source: "/api/:path*",
          },
        ]
      : [];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/ekmas/neobrutalism-components/refs/heads/main/public/pfps/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/**",
      },
    ],
  },
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
