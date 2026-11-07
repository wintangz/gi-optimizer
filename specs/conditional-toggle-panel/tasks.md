# Tasks: Team-Wide Conditional Buffs & Passives Toggle Panel (`conditional-toggle-panel`)

**Input**: Design documents from `specs/conditional-toggle-panel/`

## Phase 1: `@gi/presets` Conditional Override Persistence & Helpers

- [x] T001 Add `MemberConditionalsMap`, `PresetMemberConditionalOverrides`, `OptimizerSettings.memberConditionalOverrides`, `getPresetConditionalOverrides`, `setMemberConditionalOverride`, `resetMemberConditionalOverrides`, and `hasMemberConditionalOverrides` in `packages/presets/src/settings.ts`.

## Phase 2: `@gi/engine` Catalog Categorization & Conditional Override Application

- [x] T002 Enrich `ConditionalDescriptor` in `packages/engine/src/types.ts` and `packages/engine/src/catalog.ts` with `category: 'weapon' | 'artifact' | 'character' | 'constellation'` and `section`.
- [x] T003 Add `computeDefaultMemberConditionals`, `applyMemberConditionalOverrides`, and `readEffectiveConditionalValue` in `packages/engine/src/session.ts`, wire `memberConditionals` into `hydratePresetTeam`, `evaluate`, `optimize`, `exportGODatabase`, and `runSolver` (`packages/engine/src/solver.ts`), and export from `packages/engine/src/index.ts`.

## Phase 3: `ConditionalTogglePanel` Component & Page Integration (`apps/web`)

- [x] T004 Create `apps/web/src/components/ConditionalTogglePanel.tsx` with image-led member headers (`CharacterBadge`, `WeaponBadge`, `ArtifactBadge`), grouped conditional sections (`Weapon Passives`, `Artifact Set Effects`, `Character Talents & Passives`, `Constellation Effects`), boolean switches, multi-state `<select>` pickers, and per-member Reset buttons, and style in `apps/web/src/app/globals.css`.
- [x] T005 Integrate `ConditionalTogglePanel` into `apps/web/src/app/optimize/page.tsx` (and `apps/web/src/app/presets/page.tsx`), passing `memberConditionals` into worker evaluation, optimization, and GO database export.

## Phase 4: Tests & Full Verification

- [x] T006 Add engine and UI tests (`packages/engine/test/conditional-toggle-panel.test.ts`, `apps/web/test/ConditionalTogglePanel.test.tsx`) pinning: (a) default panel state reproduces current totals for a bundled official and a bundled Akasha preset; (b) flipping a named weapon conditional off changes the target's total in the expected direction; (c) an override survives a settings save/load round-trip; (d) reset restores the default total.
- [x] T007 Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`, verify all golden fixtures are byte-identical, and report the `apps/web/out` export size.
