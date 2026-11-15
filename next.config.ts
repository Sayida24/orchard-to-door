import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
    // Orchard photos are shrunk in the browser to a few hundred KB; leave headroom
    // above the 1 MB default (Vercel's own limit is 4.5 MB per request).
    serverActions: { bodySizeLimit: "2mb" },
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
