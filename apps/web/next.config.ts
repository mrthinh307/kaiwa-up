import type { NextConfig } from "next";

import path from "node:path";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/ekmas/neobrutalism-components/refs/heads/main/public/pfps/**",
      },
    ],
  },
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
