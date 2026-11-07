# Tasks: Official Preset Target Weapon Picker (`official-preset-weapon-picker`)

**Input**: Design documents from `/specs/official-preset-weapon-picker/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)

## Phase 1: Preset & Engine Target Weapon Resolution

- [x] T001 Update `resolvePresetMemberBuildMode` in `packages/presets/src/settings.ts` and `resolveFixedTargetOverrides` / `hydratePresetTeam` / `resolveEffectiveTeamConditionals` / `computeDefaultMemberConditionals` / `optimizeTeam` in `packages/engine/src/session.ts` so an owned target keeps its equipped weapon by default, a simulated (`tc`) target keeps its authored weapon by default, and an explicit `weaponOverride` overrides the target weapon in `evaluate` and `optimize` without affecting teammates

## Phase 2: Official Preset Target Weapon Picker UI

- [x] T002 Update `apps/web/src/app/optimize/page.tsx` to render the target weapon picker (`WeaponBadge`, `Weapon Refinement` select, `WeaponTilePicker`, and reset button) on official presets (`activePreset.source === 'official'`), and wire `targetWeaponOverrideSpec` into Current build evaluation, `startOptimization`, `startTeamOptimization`, `handleExportGO`, and `ConditionalTogglePanel`

## Phase 3: Verification

- [x] T003 Add regression tests in `packages/engine/test/official-owned-first.test.ts` and `apps/web/test/official-owned-first-ui.test.tsx`, then run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`
