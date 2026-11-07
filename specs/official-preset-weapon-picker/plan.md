# Implementation Plan: Official Preset Target Weapon Picker (`official-preset-weapon-picker`)

**Branch**: `main` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/official-preset-weapon-picker/spec.md`

## Summary

1. **Preset & Engine Target Weapon Resolution (`packages/presets/src/settings.ts` & `packages/engine/src/session.ts`)**:
   - In `resolvePresetMemberBuildMode` (`packages/presets/src/settings.ts`), respect `overrideMode` when `isTarget` is `true` (so a target with `overrideMode: 'tc'` resolves to `'tc'`, and when `overrideMode` is omitted, defaults to `memberBuildType === 'owned' ? 'owned' : 'tc'`).
   - In `resolveFixedTargetOverrides`, `hydratePresetTeam`, `resolveEffectiveTeamConditionals`, `computeDefaultMemberConditionals`, and `optimizeTeam` (`packages/engine/src/session.ts`):
     - When `weaponOverride` is NOT provided:
       - An `owned` target uses its equipped weapon in GOOD (`weaponId`).
       - A `fixed` target uses `targetMember.build.weapon`.
       - A `tc` / sim-toggled target uses its authored weapon (`targetMember.build.tc.weapon`, or `targetMember.requirement.weapon` if defined on an `owned` target toggled to `'tc'`).
     - When `weaponOverride` IS provided:
       - The target uses `buildSimulatedCachedWeapon(weaponOverride)` for both `evaluate` and `optimize` (and `optimizeTeam` member 0), auto-populating any un-authored weapon conditionals for `weaponOverride.key`, while teammates remain completely unaffected.

2. **Optimize Page Target Weapon Picker (`apps/web/src/app/optimize/page.tsx`)**:
   - Compute `hasTargetWeaponPicker` for both Akasha presets (`isAkashaPreset`) and Official presets (`activePreset.source === 'official'`).
   - Compute `targetWeaponOverrideSpec: SimulatedWeaponSpec | undefined`:
     - For Akasha presets: `akashaWeaponSpec` (always defined).
     - For Official presets: defined ONLY when `akashaWeaponByPreset[activePreset.id]` is explicitly chosen by the user (`{ key: chosen.key, level: rarity <= 2 ? 70 : 90, ascension: rarity <= 2 ? 4 : 6, refinement: rarity <= 2 ? 1 : chosen.refinement }`); otherwise `undefined` so defaults are 100% unchanged.
   - Compute `displayedTargetWeaponSpec: SimulatedWeaponSpec | undefined`:
     - Returns `targetWeaponOverrideSpec` when present; otherwise resolves the target's active default weapon (authored `tc`/`fixed` weapon when the target is simulated, or the target's equipped GOOD weapon at its actual level/ascension/refinement when owned).
   - Render the target weapon picker (`WeaponBadge`, `Weapon Refinement` `<select>`, `WeaponTilePicker`, plus a `"Reset to Default"` button when an explicit override is active on an official preset) in `optimizeMode === 'single'` for official presets alongside Akasha presets.
   - Pass `targetWeaponOverrideSpec` into Current build evaluation (`effectiveCurrent`), post-optimization build evaluations, `startOptimization`, `startTeamOptimization`, `handleExportGO`, and `ConditionalTogglePanel` (`activeTargetWeaponKey`).

## Technical Context

**Language/Version**: TypeScript 5.8, React 19, Next.js 16 (App Router, `output: 'export'`)  
**Primary Dependencies**: `@gi/engine`, `@gi/presets`, `@gi/good`  
**Testing**: Vitest (`packages/engine/test/official-owned-first.test.ts`, `apps/web/test/official-owned-first-ui.test.tsx`)

## Constitution Check

- ** Vendored GO**: Untouched.
- **Golden Fixtures**: Untouched and byte-identical.
