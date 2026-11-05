import type { NextConfig } from "next";
import { relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { goAliases } from "../../tooling/go-paths.mjs";

/**
 * apps/web is FRONTEND ONLY (constitution I): static export, no API routes,
 * no route handlers, no server actions. Optimization runs in Web Workers.
 *
 * `@genshin-optimizer/*` resolves to the pinned GO source in
 * vendor/genshin-optimizer (constitution II) via tooling/go-paths.mjs.
 */
const aliases = goAliases();
// Turbopack does not accept Windows absolute paths in resolveAlias; use
// project-relative POSIX paths instead.
const appDir = fileURLToPath(new URL(".", import.meta.url));
const turboAliases = Object.fromEntries(
  Object.entries(aliases).map(([k, v]) => [
    k,
    relative(appDir, v).split(sep).join("/"),
  ]),
);

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  transpilePackages: ["@gi/good", "@gi/engine", "@gi/presets"],
  turbopack: {
    root: fileURLToPath(new URL("../..", import.meta.url)),
    resolveAlias: turboAliases,
  },
  webpack: (config) => {
    // `$` = exact match, so lib aliases do not shadow deep GO entry points.
    config.resolve.alias = {
      ...config.resolve.alias,
      ...Object.fromEntries(Object.entries(aliases).map(([k, v]) => [`${k}$`, v])),
    };
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js", ".jsx"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    };
    return config;
  },
};

export default nextConfig;
