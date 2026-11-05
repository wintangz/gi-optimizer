# Research: Custom Teams and Presets (`custom-teams-and-presets`)

## Decisions

### 1. User Preset Helpers (`packages/presets/src/userPreset.ts`)
- **Decision**: Provide pure helper functions in `@gi/presets`:
  - `createBlankUserPreset(target: string, name?: string): Preset`
  - `forkPresetToUser(sourcePreset: Preset, newName?: string): Preset` — deep-clones the preset, sets `source: 'user'`, assigns a new `user/<slug>-<rand>` ID, sets `author: 'You'`, removes `akasha` metadata, and appends `' (copy)'` to the name if not specified.
  - `exportUserPresetJson(preset: Preset): string` — pretty-printed JSON (`JSON.stringify(preset, null, 2)`).
  - `parseImportedPresetJson(rawText: string): { ok: true; preset: Preset; convertedFromNonUser: boolean } | { ok: false; errors: Array<{ path: string; message: string }> }` — checks size ≤1 MB, parses JSON (with syntax error line/col), validates against `presetSchema`, converts `akasha`/`official` imports to `user` copies automatically while flagging `convertedFromNonUser: true`.
  - `defaultTcBuildForCharacter(characterKey: string, weaponTypeKey?: string): TcBuild` — produces a sensible default Level 90 C0 9/9/9 theorycraft build with a 4-star/5-star weapon matching the character's weapon type and 5-star Level 20 artifacts.

### 2. GO-Style Team & Rotation Builder UI (`apps/web/src/app/teams/page.tsx`)
- **Decision**: Build a full interactive team and preset editor at `/teams` supporting:
  - URL query parameters `?edit=<userPresetId>` (edit existing user preset) and `?fork=<presetId>` (duplicate any Akasha, Official, or User preset into a new draft).
  - 4-slot team lineup editor (`team[0]` target always `owned`; `team[1..3]` selectable between `owned` and `tc` assumed build with weapon, constellation, talent, artifact set, and main/substat controls).
  - Conditional toggles & stack selectors driven by `session.listConditionals(member.key)` (plus custom sheet/key entry for weapon/artifact set conditionals), team resonance/reaction conditionals, enemy level & resistance overrides, hitMode/reaction/infusionAura selectors, and bonusStats.
  - Rotation builder driven by `session.listTargets(target)` where the user adds/reorders/removes damage instances, sets hit counts, labels, and per-instance reaction/hitMode overrides.
  - Live damage preview panel using `session.evaluate(draft, session.currentBuild(draft))` whenever a GOOD file is loaded and the target character is owned.
  - Save to IndexedDB (`saveUserPreset`), Export JSON, Import JSON (with Replace / Keep Both on ID collision), and Delete with confirmation.

