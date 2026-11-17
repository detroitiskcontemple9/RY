import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // PGlite is only used for local development; keep it out of server bundles.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;

