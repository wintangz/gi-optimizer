# Research: Fast Mode (Per-Teammate Virtual 6th Artifact)

## Decision 1: Injecting Virtual 6th Artifact at the GO `art` Layer

- **Decision**: In `packages/engine/src/teamData.ts`, convert a non-target teammate's `FastModeStats` into a `Data` object via `getFastModeArtifactData(fastMode)`:
  ```ts
  {
    art: objMap(nonZeroStats, (v: number, k: string) =>
      k.endsWith('_') ? percent(toDecimal(v, k)) : constant(v)
    ),
  }
  ```
  and append it to `artifactData` in `getCharDataBundle` whenever `!useCustom` (`!isActiveTeamChar`) and `fastModeData` is defined.
- **Rationale**:
  - In GO's formula graph (`vendor/genshin-optimizer/libs/gi/wr/src/formula.ts`), `input.art.<stat>` is a `ReadNode` with `accu: 'add'` that feeds directly into `input.premod.<stat>` -> `input.total.<stat>`.
  - Real equipped artifacts (`dataObjForArtifact`) and TC builds (`getBuildTcArtifactData`) both populate `art.<stat>` using `k.endsWith('_') ? percent(toDecimal(v, k)) : constant(v)`.
  - Appending `{ art: ... }` to `artifactData` does not touch `artSet`, weapon, character, constellation, or conditionals, and works identically for both `'owned'` (`ICachedArtifact[]`) and `'tc'` (`BuildTc`) teammates.
  - Because `input.art.<stat>` uses `accu: 'add'`, adding `+40 EM` via Fast Mode produces the exact same `input.art.eleMas`, `input.premod.eleMas`, `input.total.eleMas`, and team buff nodes as adding `+40 EM` to a real artifact or TC substat map.
- **Alternatives Considered**:
  - Injecting via `TeamCharacter.bonusStats` (`customBonus`): Rejected because GO places `bonusStats` in `input.customBonus`, not `input.art`, and the specification explicitly requires injection at the **artifact layer** of that member's stat computation.

## Decision 2: Computing Both Base and Final Stats for Teammate Cards

- **Decision**: In `session.evaluate` (`packages/engine/src/session.ts`), `calc = uiDataForTeam(bundle.teamData, baseDb.gender, targetKey)` already computes `UIData` for every team member (`calc[mKey]?.target`). For each member in `preset.team`, extract `MemberStatSummary` (`{ base, final }`):
  - `base`:
    - `hp`: `memberUi.get(input.base.hp).value`
    - `atk`: `memberUi.get(input.base.atk).value`
    - `def`: `memberUi.get(input.base.def).value`
    - `eleMas`: `memberUi.get(input.premod.eleMas).value - memberUi.get(input.art.eleMas).value`
    - `enerRech_`: `memberUi.get(input.premod.enerRech_).value - memberUi.get(input.art.enerRech_).value`
    - `critRate_`: `memberUi.get(input.premod.critRate_).value - memberUi.get(input.art.critRate_).value`
    - `critDMG_`: `memberUi.get(input.premod.critDMG_).value - memberUi.get(input.art.critDMG_).value`
  - `final`:
    - `hp`, `atk`, `def`, `eleMas`, `enerRech_`, `critRate_`, `critDMG_` from `memberUi.get(input.total[k]).value`.
- **Rationale**:
  - Reuses the already-computed `calc` object from `uiDataForTeam` with zero extra `uiDataForTeam` invocations.
  - `base` remains invariant when Fast Mode (or real artifacts) change, while `final` immediately reflects the virtual 6th artifact piece and all active buffs.
- **Alternatives Considered**:
  - Running a second `uiDataForTeam` pass without artifacts: Rejected as redundant since `input.base.{hp,atk,def}` and `input.premod[k] - input.art[k]` are already present in `memberUi`.

## Decision 3: Dual Persistence Strategy (User Presets vs Bundled Presets)

- **Decision**:
  - For user presets (`preset.source === 'user'`), store Fast Mode values on `TeamMember.fastMode` inside the preset object (`presets` IndexedDB store on `/optimize` and `/teams`).
  - For bundled presets (`preset.source === 'official' | 'akasha'`), store Fast Mode values in `OptimizerSettings.fastModeByPreset[preset.id][characterKey]` (`settings` IndexedDB store).
  - Provide `resolveEffectiveFastMode(preset, settingsOrOverride)` in `@gi/presets` which resolves non-target teammates' Fast Mode stats by merging `member.fastMode` (for `idx > 0`) with `settings.fastModeByPreset?.[preset.id]?.[member.key]`, ignoring slot 0 (`preset.target`) and stripping `0` values.
- **Rationale**: Satisfies the requirement that Fast Mode values are saved in preset data for user presets and in the per-preset settings layer for bundled presets without ever mutating bundled preset JSON files.
