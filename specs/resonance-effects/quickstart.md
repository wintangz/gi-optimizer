# Quickstart & Validation Guide: Per-Effect Elemental Resonance Controls (`resonance-effects`)

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
   - Verify `listTriggeredResonances(preset)` returns `[ShatteringIce]` with `name: "Shattering Ice"` and description containing `+15% CRIT Rate` against `Frozen` opponents.
   - Evaluate `official/skirk-freeze` with default settings (`ShatteringIce` ON). Record `onEval.stats.critRate_` and `onEval.total`.
   - Switch only `ShatteringIce` OFF (`resonanceEffects: { ShatteringIce: false }`).
   - Verify `offEval.stats.critRate_` is `onEval.stats.critRate_ - 0.15` (`15.0%` lower) and `offEval.total < onEval.total`.
   - Switch `ShatteringIce` back ON (`resonanceEffects: { ShatteringIce: true }`) and verify `restoredEval.stats.critRate_ === onEval.stats.critRate_` and `restoredEval.total === onEval.total` bit-for-bit.
2. **Dual-Resonance Independence**:
   - On a 4-member team triggering two resonances (e.g. 2 Pyro + 2 Hydro triggering `FerventFlames` and `SoothingWater`, or 2 Cryo + 2 Hydro triggering `SoothingWater` and `ShatteringIce`), verify both resonances are listed in `listTriggeredResonances` and `ConditionalTogglePanel`.
   - Toggle one resonance OFF while keeping the other ON: verify the disabled resonance contributes `0` while the enabled resonance's stat contribution (`+25% Max HP`, `+25% ATK`, or `+15% CRIT Rate`) is bit-for-bit unchanged across `evaluate`, `optimize`, `compareWeapons`, and `optimizeTeam`.
3. **Defaults & Golden Fixtures**:
   - With Master ON and all per-effect switches ON, verify all golden fixtures pass byte-identically.
