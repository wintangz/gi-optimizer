import type { NextConfig } from "next";

/**
 * apps/web is FRONTEND ONLY (constitution I): static export, no API routes,
 * no route handlers, no server actions. Optimization runs in a Web Worker.
 */
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  transpilePackages: ["@gi/good", "@gi/engine", "@gi/presets"],
};

export default nextConfig;
