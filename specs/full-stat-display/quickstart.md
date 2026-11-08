# Quickstart: Full Stat Display (`full-stat-display`)

## Verification Commands

1. **Run Engine Tests (including permanent guard test & acceptance spread)**:
   ```powershell
   pnpm --filter @gi/engine test
   ```

2. **Run Web Component & Integration Tests**:
   ```powershell
   pnpm --filter @gi/web test
   ```

3. **Run Production Web Build**:
   ```powershell
   pnpm --filter @gi/web build
   ```

4. **Run Impeccable Anti-Pattern Detection**:
   ```powershell
   C:\Users\Win\AppData\Roaming\npm\impeccable.cmd detect --json apps/web/src
   ```
