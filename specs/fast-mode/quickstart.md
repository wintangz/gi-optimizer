# Quickstart Validation: Fast Mode (Per-Teammate Virtual 6th Artifact)

## Prerequisites

- Node.js 22+ and `pnpm` installed
- Dependencies installed (`pnpm install`)

## Verification Commands

1. **Run `@gi/presets` Schema & Settings Unit Tests**:
   ```powershell
   pnpm --filter @gi/presets test
   ```
   Verifies `FastModeStats` validation, target-slot stripping, and `OptimizerSettings.fastModeByPreset` helpers.

2. **Run `@gi/engine` Fast Mode & Golden Parity Tests**:
   ```powershell
   pnpm --filter @gi/engine test
   ```
   Verifies:
   - Byte-identical golden fixtures when Fast Mode is empty.
   - Kazuha `+40 EM` Fast Mode equivalence against a real `+40 EM` artifact change.
   - Negative Fast Mode stat lines, target immunity, weapon-compare sharing, and `optimizeTeam` suppression.

3. **Run `@gi/web` Component & Page Tests**:
   ```powershell
   pnpm --filter @gi/web test
   ```
   Verifies teammate cards displaying Base & Final stats, `Fast Mode` badge, typed stat lines, per-member reset, and mode visibility rules.

4. **Full Typecheck, Lint, and Production Build**:
   ```powershell
   pnpm typecheck; pnpm lint; pnpm build
   ```
