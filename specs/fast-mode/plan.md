# Implementation Plan: Fast Mode (Per-Teammate Virtual 6th Artifact)

**Branch**: `fast-mode` | **Date**: 2026-11-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/fast-mode/spec.md`

## Summary

Implement "Fast Mode", a per-teammate what-if tool that behaves like giving each non-target teammate a virtual 6th artifact:
1. **`@gi/presets` Schema & Settings**:
   - Define `FAST_MODE_STAT_KEYS` (`hp`, `hp_`, `atk`, `atk_`, `def`, `def_`, `eleMas`, `enerRech_`, `critRate_`, `critDMG_`), `FastModeStatKey`, `FastModeStats`, and `PresetFastModeMap`.
   - Extend `TeamMember` / `TeamMemberInput` with optional `fastMode?: FastModeStats`, validated in `parseTeamMember` and stripped on slot 0 (`idx === 0`, the optimization target) in `parsePreset`.
   - Extend `OptimizerSettings` with `fastModeByPreset?: Record<string, PresetFastModeMap>` and helper functions (`getPresetFastMode`, `resolveEffectiveFastMode`, `setPresetMemberFastModeStat`, `resetPresetMemberFastMode`, `hasMemberFastMode`, `hasPresetFastMode`).
2. **`@gi/engine` Artifact-Layer Injection & Member Base/Final Stats**:
   - Add `getFastModeArtifactData(fastMode)` in `packages/engine/src/teamData.ts` to produce `{ art: { [k]: k.endsWith('_') ? percent(toDecimal(v, k)) : constant(v) } }` and append it to `artifactData` in `getCharDataBundle` for non-target teammates (`!isActiveTeamChar`).
   - Associate resolved `PresetFastModeMap` with `db` during `hydratePresetTeam` (and include in `presetTeamFingerprint`). Suppress Fast Mode when `disableFastMode: true` (used by `optimizeTeam`).
   - Extract `memberStats?: Record<string, MemberStatSummary>` (`base` and `final` stats for each team member) in `session.evaluate` and include on `RotationResult`.
   - Plumb `fastMode` through `BuildSelection`, `session.optimize`, and `session.compareWeapons`.
3. **`@gi/web` Teammate Cards UI & Persistence**:
   - Build `TeammateFastModePanel` / teammate cards on `/optimize` (and Fast Mode section in `/teams` member cards) displaying both **Base** and **Final** stats, a visible `Fast Mode` badge when active, the typed stat lines, inline controls to add/edit/remove stat lines, and a per-member Reset button.
   - Hide/disable Fast Mode for the optimization target (slot 0) and when `optimizeMode === 'team'`.
   - Persist Fast Mode edits to user preset data (`saveUserPreset` / `draft.team[idx].fastMode`) for `source === 'user'` and to `OptimizerSettings` (`updateSettings`) for bundled `official` / `akasha` presets.

## Technical Context

**Language/Version**: TypeScript 5.6 (ESM, strict mode)
**Primary Dependencies**: `@genshin-optimizer/gi/*` (vendored, read-only), `@gi/good`, `@gi/presets`, `@gi/engine`, Next.js 15 / React 19 (`@gi/web`)
**Storage**: IndexedDB (`gi-optimizer-db` `settings` store for `OptimizerSettings` and `presets` store for user `Preset`s)
**Testing**: Vitest (`packages/presets/test`, `packages/engine/test`, `apps/web/test`)
**Target Platform**: Browser (Static Next.js export + Web Workers) & Node.js 22+
**Performance Goals**: Zero overhead when Fast Mode is empty; instant reactive re-evaluation when typing Fast Mode stat lines.
**Constraints**:
- Never modify `vendor/genshin-optimizer` or bundled preset JSON files.
- Optimization target (`preset.target` / slot 0) can never receive a virtual piece.
- Fast Mode is available in `single` and `compare` modes, and unavailable in `team` optimize mode.
- All existing golden fixtures must remain byte-identical when Fast Mode is empty.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Vendored GO Read-Only**: Passed — `getFastModeArtifactData` lives in `packages/engine/src/teamData.ts` using public `@genshin-optimizer/gi/wr` primitives (`constant`, `percent`) and `@genshin-optimizer/common/util` (`toDecimal`, `objMap`).
- **Bundled Presets Untouched**: Passed — bundled presets store Fast Mode in `OptimizerSettings.fastModeByPreset[preset.id]`; user presets store Fast Mode in `TeamMember.fastMode`.
- **Golden Fixture Parity**: Passed — when Fast Mode is empty, no extra `Data` object is appended to `artifactData`, preserving exact node structures and byte-identical golden fixtures.

## Project Structure

### Documentation (this feature)

```text
specs/fast-mode/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/presets/
├── src/
│   ├── schema.ts
│   ├── settings.ts
│   └── index.ts
└── test/
    ├── schema.test.ts
    └── settings.test.ts

packages/engine/
├── src/
│   ├── types.ts
│   ├── teamData.ts
│   ├── session.ts
│   ├── solver.ts
│   └── index.ts
└── test/
    └── buff-coverage.test.ts

apps/web/
├── src/
│   ├── components/
│   │   └── TeammateFastModePanel.tsx
│   └── app/
│       ├── optimize/
│       │   └── page.tsx
│       └── teams/
│           └── page.tsx
└── test/
    └── TeammateFastModePanel.test.tsx
```

**Structure Decision**: Existing monorepo package boundaries (`@gi/presets` → `@gi/engine` → `@gi/web`) are preserved.
