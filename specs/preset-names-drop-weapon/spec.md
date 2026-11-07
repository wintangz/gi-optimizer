# Feature Specification: Bundled Preset Display Names Without Weapon References (`preset-names-drop-weapon`)

**Feature Branch**: `main` (`preset-names-drop-weapon`)  
**Created**: 2026-11-07  
**Status**: Implemented  
**Input**: User description: "Feature 3: preset-names-drop-weapon. Bundled preset display names still bake in a weapon (e.g. 'Furina — Salon Solitaire (Primordial Jade Cutter, Avg 200 Fanfare)', 'Hu Tao — Double Hydro Vaporize Combo (Staff of Homa R1, C1)'), even though the user picks the weapon in the UI. Rename every bundled preset whose name contains a weapon name and/or refinement (mainly the Akasha set: PJC, Splendor R1, Staff of Homa R1, Prototype Amber R5, Scarlet Sands R1) by removing the weapon reference only. Keep the case-defining parts: character, constellation (C1/C2), Fanfare, team/rotation descriptors. Do not change preset ids, file names, or the akasha provenance notes (those document the case's original default weapon and stay). Update any test or fixture that pins a preset name."

## Clarifications & Logged Assumptions

- **Renamed Bundled Presets (5 Akasha Presets)**:
  1. `akasha/furina-salon-pjc-c0`:
     - Before: `"Furina — Salon Solitaire (Primordial Jade Cutter, Avg 200 Fanfare)"`
     - After: `"Furina — Salon Solitaire (Avg 200 Fanfare)"`
  2. `akasha/furina-splendor-c2`:
     - Before: `"Furina — Salon Solitaire C2 (Splendor of Tranquil Waters R1)"`
     - After: `"Furina — Salon Solitaire C2"`
  3. `akasha/hutao-double-hydro-homa-c1`:
     - Before: `"Hu Tao — Double Hydro Vaporize Combo (Staff of Homa R1, C1)"`
     - After: `"Hu Tao — Double Hydro Vaporize Combo (C1)"`
  4. `akasha/neuvillette-hypercarry-protoamber-c0`:
     - Before: `"Neuvillette — Hypercarry Double Hydro (Prototype Amber R5)"`
     - After: `"Neuvillette — Hypercarry Double Hydro"`
  5. `akasha/raiden-hypercarry-scarlet-c0`:
     - Before: `"Raiden Shogun — Hypercarry (Sara C6 + Kazuha + Bennett, Scarlet Sands R1)"`
     - After: `"Raiden Shogun — Hypercarry (Sara C6 + Kazuha + Bennett)"`
- **Official Presets**: All 6 bundled `official/*` presets already have weapon-free display names and remain unchanged.
- **Preserved Fields**: Preset `id`s, JSON filenames, and `akasha` provenance fields (`calculationId`, `leaderboardUrl`, `label`, `retrievedAt`, `notes`) remain untouched.
- **Engine Parity Guard (`packages/engine/src/teamData.ts`)**: Line 340 of `packages/engine/src/teamData.ts` checks `team.name` for the 2-member `akasha/furina-splendor-c2` team; it is updated to recognize both `"Furina — Salon Solitaire C2"` and `"Furina — Salon Solitaire C2 (Splendor of Tranquil Waters R1)"` so golden evaluation parity is 100% preserved.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Weapon-Neutral Preset Display Names (Priority: P1)

When browsing or selecting bundled presets on `/presets` or `/optimize`, the preset display name describes the character, constellation, Fanfare, and team/rotation archetype without baking in a fixed weapon name or refinement rank (`R1`–`R5`).

**Why this priority**: Since users freely select their weapon in the UI (both in Akasha mode and Owned mode), baking a weapon name into the preset title was misleading.

**Independent Test**: Load all bundled presets via `listBundledPresets()` and assert that none of their `name` fields contain any weapon display name, weapon abbreviation (`PJC`, `Homa`, `Splendor`, `Prototype Amber`, `Scarlet Sands`), or weapon refinement token (`R1`–`R5`), while their `id`s and `akasha.notes` remain intact.

**Acceptance Scenarios**:

1. **Given** all 11 bundled presets (`listBundledPresets()`), **When** inspecting `preset.name`, **Then** every preset matches its expected weapon-free display name and contains no weapon name or `R1`–`R5` refinement tag.
2. **Given** all 5 Akasha presets, **When** evaluated against their golden fixtures (`packages/engine/test/golden.test.ts`), **Then** all totals and instance breakdowns match with zero drift.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Every bundled preset in `packages/presets/data/akasha/*.json` MUST remove weapon names and weapon refinement tags from its top-level `name` field while keeping character, constellation (`C1`/`C2`), Fanfare, and team/rotation descriptors.
- **FR-002**: Preset `id`s, JSON file names, and `akasha` provenance metadata (`notes`, `label`, `leaderboardUrl`, `calculationId`) MUST NOT be changed.
- **FR-003**: `packages/engine/src/teamData.ts` MUST handle the updated `akasha/furina-splendor-c2` preset `name` without changing evaluation or optimization outputs.
- **FR-004**: A permanent unit test in `packages/presets/test/match.test.ts` MUST assert the exact weapon-free `name` of all 5 Akasha presets and verify that no bundled preset `name` contains a weapon name or `R1`–`R5` refinement marker.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All bundled preset tests (`packages/presets/test/match.test.ts`) and golden parity tests (`packages/engine/test/golden.test.ts`) pass with 0 errors.
- **SC-002**: Full repository verification (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`) passes cleanly.
