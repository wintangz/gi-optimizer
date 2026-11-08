# Quickstart & Validation Guide: Master Elemental Resonance Toggle (`resonance-master-toggle`)

## Verification Commands

```powershell
pnpm --filter @gi/presets test
pnpm --filter @gi/engine test
pnpm --filter @gi/web test
pnpm typecheck
pnpm lint
pnpm build
```

## Acceptance Verification Scenarios

1. **Skirk Freeze Preset (`official/skirk-freeze`)**:
   - Evaluate `official/skirk-freeze` with default settings (`Elemental Resonance` ON). Record `onEval.stats.critRate_` and `onEval.total`, and verify `Elemental Resonance` (`category: 'resonance'`) is present in `onEval.statBreakdowns.critRate_.contributors` (and damage factor breakdowns).
   - Toggle `Elemental Resonance` OFF (`setPresetResonanceEnabled(settings, 'official/skirk-freeze', false)` / `resonanceEnabled: false`).
   - Verify `offEval.stats.critRate_` is exactly `onEval.stats.critRate_ - 0.15` (within floating-point precision `1e-9`), `offEval.total < onEval.total`, and no contributor in `offEval` has `category === 'resonance'`.
   - Toggle `Elemental Resonance` back ON (`setPresetResonanceEnabled(settings, 'official/skirk-freeze', true)`) and verify `restoredEval.stats.critRate_ === onEval.stats.critRate_` and `restoredEval.total === onEval.total` bit-for-bit.
2. **All Elements Suppressed Across Modes**:
   - Verify Pyro (`atk_`), Hydro (`hp_`), Cryo (`critRate_`), Geo (`all_dmg_`, `shield_`, `geo_enemyRes_`), and Dendro (`eleMas`) resonances are suppressed when OFF across `evaluate`, `optimize`, `compareWeapons`, and `optimizeTeam`.
3. **UI Control in `ConditionalTogglePanel`**:
   - Verify the `"Elemental Resonance"` switch renders in `ConditionalTogglePanel`, defaults to `ON` (`aria-checked="true"`), toggles to `OFF` (`aria-checked="false"`), and persists per preset in `OptimizerSettings`.
