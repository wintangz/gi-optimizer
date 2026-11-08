# Quickstart: Full Damage Display (`full-damage-display`)

## Verification Commands

1. **Build Engine Bundle**:
   ```bash
   pnpm --filter @gi/engine build
   ```
2. **Run Engine Unit & Golden Tests**:
   ```bash
   pnpm --filter @gi/engine test
   ```
3. **Run Web Component Tests**:
   ```bash
   pnpm --filter @gi/web test
   ```
4. **Build Production Web App**:
   ```bash
   pnpm --filter @gi/web build
   ```
5. **Run Impeccable Anti-Pattern Detector**:
   ```bash
   npx impeccable detect --json apps/web/src
   ```
