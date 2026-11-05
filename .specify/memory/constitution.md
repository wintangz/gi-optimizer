# gi-optimizer Constitution

A personal, preset-first Genshin Impact build optimizer in the spirit of Genshin Optimizer (GO)
and Akasha. Features are referred to by **slug only** (e.g. `good-import`); they are never
numbered. The git commit is the version of every artifact in this repository.

## Core Principles

### I. Frontend-Only Client (NON-NEGOTIABLE)

- `apps/web` is a Next.js + TypeScript **static frontend**. It MUST NOT contain API routes,
  route handlers, server actions, middleware with server logic, or any server-side data access.
  It is built with static export.
- Optimization runs **client-side in a Web Worker**. It never runs on a server — not now, and
  not when a server exists.
- Persistent user data lives in the browser in **IndexedDB**. Nothing leaves the device.
- A future server will be a separate `apps/server` and will only ever handle accounts and
  preset storage. It does not exist in the current phase and MUST NOT be scaffolded.

### II. GO Formula Fidelity (NON-NEGOTIABLE)

- Damage calculation uses the **Genshin Optimizer formula base**: GO's own formula engine,
  character/weapon/artifact sheets and stat data, consumed from GO's source (vendored,
  pinned to a commit). Formulas MUST NOT be re-derived from the wiki, and a gcsim-style
  action simulator MUST NOT be the core.
- Every supported character has **golden fixtures** captured from GO itself (same character,
  weapon, artifacts, team, conditionals → GO's displayed numbers). A character whose numbers
  do not match GO within tolerance (relative error ≤ 0.1% per damage instance) is
  **not done** and MUST NOT be offered by an official or Akasha preset.

### III. Import Is GOOD Only

- The only data import is the **GOOD** format produced by scanners (e.g. Irminsul, Inventory
  Kamera, GO export). UID / Enka / showcase import MUST NOT be built: showcase data cannot be
  optimised.
- Parse errors are reported plainly (what, where, why) and never silently dropped.

### IV. Presets Are Plain JSON Setup Bundles

- A preset is a plain JSON document describing a setup: team context, target character,
  weapon/constellation/talent requirements, rotation (damage instances × counts) and buff /
  conditional assumptions. A preset makes **no damage claim**; numbers always come from the
  user's own artifacts at run time.
- One preset schema serves all sources: `akasha`, `official`, `user`. Source only changes
  authorship, badge and leaderboard linkage.
- Presets MUST NOT be silently adapted. If the user's account does not match an Akasha preset
  (character, constellation, weapon, refinement, teammates), the mismatch is shown plainly,
  part by part, and nothing is substituted.

### V. Single-Character, Akasha-Style Objective

- The optimizer maximises **one** character's total damage: the sum of every damage instance
  that character deals over one (or more) preset rotations.
- **Energy Recharge never enters the damage calculation.** ER floors and pool rules (e.g.
  include artifacts equipped on other characters) are **user settings**, GO-style, not preset
  rules.
- Team-total optimisation is a later feature and MUST NOT be built now.

## Scope Law (current phase)

- Personal use first: local web client only — no server app, no accounts, no community
  features, no preset uploads.
- Out of scope, noted as later: `team-total-optimizer`, community preset library / uploads,
  quick-register accounts, any server.
- Assumptions are logged in the relevant spec's Assumptions section instead of blocking.

## Engineering Standards

- **Stack**: pnpm workspace. `apps/web` (Next.js App Router, TypeScript strict, static
  export). Shared logic lives in `packages/*` as plain TypeScript, framework-free and testable
  in Node.
- **Testing**: Vitest for packages and web logic; GO golden-fixture tests are mandatory for the
  calc engine; Playwright smoke tests for primary UI flows where practical.
- **Layering**: `packages/good` (GOOD schema + parser) → `packages/engine` (GO adapter, damage
  evaluation, optimizer core) → `packages/presets` (schema, validation, matching, bundled
  presets) → `apps/web` (UI, IndexedDB, worker host).
- **Simplicity**: no speculative abstractions; no dependencies added without a reason recorded
  in the feature plan.

## Governance

- This constitution supersedes other practices. Every plan's Constitution Check gates on it.
- Amendments are made by editing this file in a commit that explains the change; the commit is
  the version. No separate version numbers are maintained.
- Reviews verify: no server code in `apps/web`, no non-GOOD importers, no non-GO formulas, ER
  excluded from damage, presets never silently substituted, golden fixtures present for any
  character offered in a non-user preset.

**Version**: tracked by git commit | **Ratified**: 2026-11-05 | **Last Amended**: 2026-11-05
