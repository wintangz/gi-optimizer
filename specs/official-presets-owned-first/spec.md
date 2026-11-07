# Feature Specification: Official Presets Owned-First Teammate Resolution (`official-presets-owned-first`)

**Feature Branch**: `main` (`official-presets-owned-first`)  
**Created**: 2026-11-07  
**Status**: Draft  
**Input**: User description: "Feature: official-presets-owned-first. Run the full Spec Kit flow autonomously (specify → plan → tasks → implement → test) without asking me questions; log assumptions in the spec. Run after rarity-border-tiles. Commit as 'feat: official-presets-owned-first' and push to origin main."

## Clarifications & Logged Assumptions

- **Official-Preset Scope Only**: Owned-first teammate resolution applies exclusively to presets where `preset.source === 'official'`. Akasha presets (`preset.source === 'akasha'`) and custom user presets (`preset.source === 'user'`) retain their exact existing isolation semantics, and all Akasha golden fixtures (`packages/engine/test/golden/akasha__*.json`) remain byte-identical.
- **Target Member Invariance**: The target member (`preset.team[0]`, `isTarget === true`) is unchanged across all preset sources.
- **Owned-First Resolution Rule for Official Teammates (`i > 0`)**:
  - Ownership is determined against the user's imported GOOD `characters` array (`goodCharKeys`, captured before any dummy `db.chars.getWithInitWeapon` hydration).
  - If the user **owns** the teammate (`goodCharKeys.has(member.key)`), the teammate defaults to `'owned'` (`buildType: 'equipped'` in Genshin Optimizer `TeamData`), reading the character's constellation, level, ascension, talents, equipped weapon, and equipped artifacts directly from the imported GOOD database.
  - If the user **does not own** the teammate (`!goodCharKeys.has(member.key)`), the teammate resolves to `'tc'` (the preset's simulated build) and is visibly labelled as simulated (`simulated={true}` on `CharacterBadge` showing the `SIM` pill + explicit `"Not in GOOD — Simulated"` status in the UI). Substitution is never silent.
  - Whether or not the user owns the character, the preset's simulated (`'tc'`) build remains available as a per-member toggle in the UI. When the user does not own the character, the toggle is locked to `'tc'` (`Simulated (TC)`) with a visible explanation that the character is not in GOOD.
- **Per-Member Persistence**: The user's per-member build mode choices are persisted in `OptimizerSettings.memberBuildModes?: Record<string, Record<string, 'owned' | 'tc'>>` (keyed by `[presetId][characterKey]`) in `localStorage` alongside other optimize settings, and can also be passed via `BuildSelection.memberBuildModes` / `optimize` options (`Record<string, 'owned' | 'tc'>`).
- **Conditional Source Switching**:
  - Preset-authored conditionals (`member.conditional`) on a non-target member (`i > 0`) describe the simulated (`'tc'`) build only.
  - When a non-target member runs in **owned (`'owned'`)** mode, it gets the same conditional derivation an owned target gets today from its actual build in `db`:
    1. Boolean artifact-set conditionals defaulted to `'on'` via `getDefaultTargetArtifactSetConditionals()` (which GO gates on the character actually wearing 2pc/4pc of that set in `db`).
    2. Weapon sheet conditionals auto-populated at their maximum state via `listWeaponConditionals(equippedWeaponKey)` for the weapon actually equipped on that member in `db`.
  - When a non-target member runs in **simulated (`'tc'`)** mode, it uses `member.conditional` (plus the existing `ArchaicPetra` `ele -> element` bridge) and `member.build.tc`.
  - Switching a member between `'owned'` and `'tc'` switches both its GO `LoadoutDatum` (`buildType: 'equipped'` vs `buildType: 'tc'`) and which conditional source applies, and invalidates `dbPresetCache` via `presetTeamFingerprint`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Owned Teammates in Official Presets Default to User's GOOD Build & Derived Conditionals (Priority: P1)

When evaluating or optimizing an official preset (`preset.source === 'official'`), any supporting teammate (`i > 0`) present in the user's imported GOOD `characters` list defaults to `'owned'` mode: using the user's constellation, level, talents, equipped weapon, and equipped artifacts from GOOD, with worn-set and weapon conditionals derived from that actual build rather than the preset's simulated TC conditionals.

**Why this priority**: Makes official presets reflect the user's real account investment and teammate gear by default instead of hardcoding TC teammate assumptions when the user owns those characters.

**Independent Test**: Evaluate an official preset with a GOOD dataset containing the teammates; verify `evaluate` and `optimize` use the teammates' GOOD builds and derived conditionals by default, and re-baselined official golden fixtures match direct GO evaluation.

**Acceptance Scenarios**:

1. **Given** `official/furina-salon-subdps` or `official/mavuika-melt-hypercarry` and a GOOD import that owns the supporting teammates, **When** `session.evaluate(preset)` or `session.optimize(preset, settings)` runs with default settings, **Then** each owned teammate runs with `buildType: 'equipped'` and conditionals derived from their actual equipped weapon and artifact sets in GOOD.
2. **Given** an owned teammate whose GOOD build changes (e.g., constellation, weapon refinement, or equipped 4pc support artifact set), **When** `session.evaluate(preset)` runs in default `'owned'` mode, **Then** the target's rotation total reflects the teammate's actual GOOD build change.

---

### User Story 2 - Per-Member Toggle Between Owned Build and Simulated (TC) Build with Persistence (Priority: P1)

In the UI (and engine API), each non-target member of an official preset has a per-member build mode toggle (`Owned` vs `Simulated (TC)`). Switching a member (or all members) to `'tc'` switches that member to the preset's simulated build (`member.build.tc`) and preset-authored conditionals (`member.conditional`), reproducing the exact legacy TC rotation totals. The choice persists per preset and member in `OptimizerSettings`.

**Why this priority**: Allows users to compare their actual teammate build against the preset's assumed TC build or substitute a teammate they haven't built yet, while persisting their choice across reloads.

**Independent Test**: Toggle all teammates of each official preset to `'tc'` via `memberBuildModes` and assert `session.evaluate(preset, { memberBuildModes })` reproduces the exact pre-change TC totals; toggle in the `/optimize` UI and assert `OptimizerSettings.memberBuildModes` updates and re-evaluates.

**Acceptance Scenarios**:

1. **Given** any bundled official preset, **When** all non-target teammates are set to `'tc'` in `memberBuildModes`, **Then** `session.evaluate(preset, { memberBuildModes })` produces the exact legacy TC rotation total.
2. **Given** the `/optimize` page with an official preset selected and GOOD imported, **When** the user clicks a teammate's build toggle from `Owned` to `Simulated (TC)`, **Then** `settings.memberBuildModes[preset.id][member.key]` is persisted as `'tc'`, the teammate's `CharacterBadge` displays `SIM` (`data-simulated="true"`), and the rotation evaluation updates.

---

### User Story 3 - Unowned Teammate Fallback to Simulated Build with Visible Labelling (Priority: P1)

When a non-target member of an official preset is absent from the user's GOOD `characters` list, that member automatically runs as the preset's simulated (`'tc'`) build and is visibly labelled as simulated (`SIM` badge + explicit `"Not in GOOD — Simulated"` indicator) so substitution is never silent.

**Why this priority**: Guarantees that missing teammates never silently masquerade as owned builds or crash evaluation with naked Lv.1 characters.

**Independent Test**: Remove a teammate (e.g. `Citlali` or `Zhongli`) from a GOOD dataset, evaluate and render the official preset, and assert the engine uses the preset's `'tc'` build + `member.conditional` for that teammate while the UI renders `data-simulated="true"` (`SIM`) and a visible `"Not in GOOD — Simulated"` label.

**Acceptance Scenarios**:

1. **Given** a GOOD import where a teammate of an official preset is absent from `good.characters`, **When** `session.evaluate(preset)` runs, **Then** that teammate automatically uses `buildType: 'tc'` (`member.build.tc`) and `member.conditional` even if `memberBuildModes` is empty or requests `'owned'`.
2. **Given** the `/optimize` or `/presets` page with that GOOD import, **When** the official preset team is rendered, **Then** the unowned teammate's `CharacterBadge` has `data-simulated="true"` (`SIM` pill) and its build toggle visibly shows that it is running as `Simulated (Not in GOOD)`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `@gi/presets` (`packages/presets/src/settings.ts`) MUST define `MemberBuildMode = 'owned' | 'tc'`, `MemberBuildModesMap = Record<string, MemberBuildMode>`, and optional `memberBuildModes?: Record<string, MemberBuildModesMap>` on `OptimizerSettings`, along with `resolvePresetMemberBuildMode` and settings helpers.
- **FR-002**: `@gi/engine` (`packages/engine/src/session.ts` and `packages/engine/src/types.ts`) MUST accept `memberBuildModes?: Record<string, 'owned' | 'tc'>` on `BuildSelection` and `optimize` options (and read `settings.memberBuildModes?.[preset.id]` in `optimize`).
- **FR-003**: For `preset.source === 'official'`, `hydratePresetTeam` (and `computeDirectGOGolden` in `packages/engine/scripts/capture-golden.ts`) MUST resolve each non-target member (`i > 0`) against the GOOD dataset's owned character keys:
  - Owned in GOOD and `memberBuildModes?.[mKey] !== 'tc'` → `'owned'` mode (`buildType: 'equipped'`, conditionals derived from `getDefaultTargetArtifactSetConditionals()` + `listWeaponConditionals(equippedWeaponKey)` at max state).
  - Absent from GOOD or `memberBuildModes?.[mKey] === 'tc'` → `'tc'` mode (`buildType: 'tc'` using `member.build.tc`, conditionals from preset-authored `member.conditional` with the `ArchaicPetra` `ele -> element` bridge).
- **FR-004**: Target member (`i === 0`) behaviour and all `akasha` / `user` preset semantics MUST remain untouched; all `packages/engine/test/golden/akasha__*.json` fixtures MUST remain byte-identical.
- **FR-005**: The `/optimize` page (`apps/web/src/app/optimize/page.tsx`) and `/presets` page (`apps/web/src/app/presets/page.tsx`) MUST display each official-preset teammate's resolved build state (`CharacterBadge` `simulated={effectiveMode === 'tc'}`), provide a per-member `Owned` / `Simulated (TC)` toggle persisted in `OptimizerSettings.memberBuildModes`, and visibly label unowned teammates as simulated (`Not in GOOD — Simulated`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 6 official golden fixtures (`packages/engine/test/golden/official__*.json`) are re-baselined to the new owned-first defaults and pass `packages/engine/test/golden.test.ts` within `<= 0.1%` relative error, while `git diff packages/engine/test/golden/akasha__*.json` is empty (0 bytes changed).
- **SC-002**: Automated engine and web component tests pin: (1) owned member present in GOOD → owned build and derived conditionals used by default; (2) toggle member to simulated (`'tc'`) → reproduces the exact legacy TC totals; (3) character absent from GOOD → simulated build used and visibly labelled in the UI.
- **SC-003**: `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` pass with zero errors.
