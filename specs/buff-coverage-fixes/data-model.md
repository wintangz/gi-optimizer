# Data Model: Buff Coverage Fixes (`buff-coverage-fixes`)

## 1. Bundled Official Preset Data Updates

### `packages/presets/data/official/mavuika-melt-hypercarry.json`
- **Citlali (`team[1].conditional`)**:
  ```json
  "conditional": {
    "Citlali": { "a1NsFreezeMelt": "on" },
    "ScrollOfTheHeroOfCinderCity": { "nsReact": "on", "afterReact": "on" },
    "ThrillingTalesOfDragonSlayers": { "Heritage": "on" }
  }
  ```
- **Xilonen (`team[2].conditional`)**:
  ```json
  "conditional": {
    "Xilonen": { "sourceActive": "on" },
    "ArchaicPetra": { "ele": "pyro", "element": "pyro" }
  }
  ```

### `packages/presets/data/official/furina-salon-subdps.json`
- **Zhongli (`team[3].conditional`)**:
  ```json
  "conditional": {
    "Zhongli": { "skill": "on" },
    "ArchaicPetra": { "ele": "hydro", "element": "hydro" }
  }
  ```

## 2. Target Boolean Artifact-Set Conditional Defaults (`packages/engine/src/catalog.ts`)

```ts
export function getDefaultTargetArtifactSetConditionals(): Record<
  string,
  Record<string, string>
>
```
- Maps each artifact set `setKey` that has at least one boolean on/off conditional (`states.length === 1 && states[0].key === 'on'`, excluding multi-path reaction selectors) to `{ [condKey]: 'on' }`.
- Applied in `hydratePresetTeam` for `i === 0` (`isTarget`) only when `!member.conditional[setKey]`.

## 3. Default TC Teammate Conditional (`packages/presets/src/userPreset.ts`)

```ts
export const DEFAULT_TC_TEAMMATE_CONDITIONAL: Record<
  string,
  Record<string, string>
> = {
  NoblesseOblige: { set4: 'on' },
}
```
- Applied when adding a teammate (`addTeammate`) or toggling a teammate to TC (`toggleTeammateBuildType`) in `apps/web/src/app/teams/page.tsx`.
