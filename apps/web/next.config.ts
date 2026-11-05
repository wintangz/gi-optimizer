import type { NextConfig } from "next";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * apps/web is FRONTEND ONLY (constitution I): static export, no API routes,
 * no route handlers, no server actions. Optimization runs in Web Workers
 * (`/workers/optimizer.worker.js` and `/workers/BackgroundWorker.js`) prebuilt
 * by `@gi/engine` (`packages/engine/scripts/build-engine.mjs`).
 *
 * Next.js never transpiles raw TypeScript from `vendor/genshin-optimizer` or
 * `packages/engine/src`; instead, `@gi/engine` and `@genshin-optimizer/gi/consts`
 * resolve to prebuilt ESM bundles in `packages/engine/dist/`.
 */
const appDir = fileURLToPath(new URL(".", import.meta.url));
const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

const prebuiltAliases: Record<string, string> = {
  "@gi/engine": resolve(repoRoot, "packages/engine/dist/index.mjs"),
  [resolve(repoRoot, "packages/engine/src/index.ts")]: resolve(
    repoRoot,
    "packages/engine/dist/index.mjs",
  ),
  "@genshin-optimizer/gi/consts": resolve(
    repoRoot,
    "packages/engine/dist/gi-consts.mjs",
  ),
};

// Turbopack requires project-relative POSIX paths in resolveAlias.
const turboAliases = Object.fromEntries(
  Object.entries(prebuiltAliases).map(([k, v]) => [
    k,
    relative(appDir, v).split(sep).join("/"),
  ]),
);

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  transpilePackages: ["@gi/good", "@gi/presets"],
  turbopack: {
    root: repoRoot,
    resolveAlias: turboAliases,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      ...Object.fromEntries(
        Object.entries(prebuiltAliases).map(([k, v]) => [`${k}$`, v]),
      ),
    };
    return config;
  },
};

export default nextConfig;
