# Data Model & Module Contracts: Trim Genshin Optimizer Runtime (`trim-go-runtime`)

This feature is a build-graph and runtime-trimming architecture refactor. It introduces no persistent user data or IndexedDB schema changes (`gi-optimizer-db` v1 and `@gi/presets` `Preset` schema remain untouched). The internal contracts below govern the stub modules, the headless `teamData` module, and the prebuilt engine/worker artifacts.

---

## 1. GO Stub Modules (`tooling/go-stubs/`)

### 1.1 `tooling/go-stubs/assets.ts`
Replaces `@genshin-optimizer/gi/assets` and `@genshin-optimizer/gi/assets-data`.

```ts
// Recursive callable proxy returning '' for any property chain or function call
const emptyProxy: any = new Proxy(() => '', {
  get: (_, prop) => (prop === Symbol.toPrimitive ? () => '' : emptyProxy),
  apply: () => '',
})

export const artifactDefIcon = (_slotKey?: string): string => ''
export const characterAsset = (_charKey?: string, _asset?: string, _gender?: string): string => ''
export const weaponAsset = (_weaponKey?: string, _ascended?: boolean): string => ''
export const imgAssets: Record<string, any> = emptyProxy
export const AssetData: Record<string, any> = emptyProxy
export default emptyProxy
```

### 1.2 `tooling/go-stubs/ui.ts`
Replaces `@genshin-optimizer/common/ui`, `@genshin-optimizer/common/svgicons`, `@genshin-optimizer/gi/ui`, `@genshin-optimizer/gi/svgicons`, and (in `build-engine.mjs`) `react`, `react/jsx-runtime`, `@emotion/react/jsx-runtime`, and `@mui/material`.

```ts
export interface StubReactElement {
  type: string | ((props: Record<string, unknown>) => unknown)
  props: Record<string, unknown>
}

export const jsx = (
  type: StubReactElement['type'],
  props?: Record<string, unknown>
): StubReactElement => ({
  type,
  props: props ?? {},
})
export const jsxs = jsx
export const jsxDEV = jsx
export const Fragment = 'Fragment'

export const createElement = (
  type: StubReactElement['type'],
  props?: Record<string, unknown> | null,
  ...children: unknown[]
): StubReactElement => ({
  type,
  props: {
    ...(props ?? {}),
    children: children.length <= 1 ? children[0] : children,
  },
})

export const useEffect = (): void => {}
export const useState = <T>(init: T | (() => T)): [T, () => void] => [
  typeof init === 'function' ? (init as () => T)() : init,
  () => {},
]

export const ColorText = 'ColorText'
export const SqBadge = 'SqBadge'
export const ImgIcon = (): null => null
export const Box = 'Box'
export const StatIcon = (): null => null
export const ElementIcon = (): null => null
export const AnemoIcon = (): null => null
export const CryoIcon = (): null => null
export const DendroIcon = (): null => null
export const ElectroIcon = (): null => null
export const GeoIcon = (): null => null
export const HydroIcon = (): null => null
export const PyroIcon = (): null => null
export const PhysicalIcon = (): null => null
export const iconInlineProps: Record<string, unknown> = {}
```

### 1.3 `tooling/go-stubs/i18n.ts`
Replaces `@genshin-optimizer/gi/i18n`.

```ts
export const Translate = 'Translate'
export const i18nInstance = { t: (key: string) => key }
```

### 1.4 `tooling/go-stubs/db-ui.ts`
Replaces `@genshin-optimizer/gi/db-ui`.

```ts
export const useDatabase = (): never => {
  throw new Error('useDatabase React hook is not available in headless engine')
}
export const useDBMeta = (): never => {
  throw new Error('useDBMeta React hook is not available in headless engine')
}
```

### 1.5 `tooling/go-stubs/zod.ts`
Used by `packages/engine/scripts/build-engine.mjs` to satisfy `@genshin-optimizer/gi/db` and `@genshin-optimizer/gi/schema` validation/coercion chains without bundling 455 KB of Zod v4 locale strings and JSON-schema generators.

- Supports `z.string()`, `z.number()`, `z.boolean()`, `z.literal()`, `z.enum()`, `z.nativeEnum()`, `z.array()`, `z.tuple()`, `z.record()`, `z.object()`, `z.looseObject()`, `z.strictObject()`, `z.union()`, `z.discriminatedUnion()`, `z.intersection()`, `z.any()`, `z.unknown()`, `z.lazy()`, `z.preprocess()`, `z.coerce.*`.
- Every schema instance is wrapped in a `Proxy` implementing `.parse()`, `.safeParse()`, `.optional()`, `.nullable()`, `.nullish()`, `.default()`, `.catch()`, `.transform()`, `.pipe()`, `.or()`, `.and()`, `.array()`, and returning `this` for any constraint modifier (`.int()`, `.min()`, `.max()`, `.finite()`, `.passthrough()`, `.strict()`, `.strip()`, etc.).

---

## 2. Headless Team Data Contract (`packages/engine/src/teamData.ts`)

Ported directly from `vendor/genshin-optimizer/libs/gi/ui/src/hooks/useTeamData.ts` (lines 18–454, omitting only the `useTeamData` React hook on lines 42–92 and the `react`, `@genshin-optimizer/common/react-util`, and `@genshin-optimizer/gi/db-ui` imports):

```ts
import type { ArtCharDatabase, ICachedArtifact, ICachedCharacter, ICachedWeapon } from '@genshin-optimizer/gi/db'
import type { CharacterKey, GenderKey } from '@genshin-optimizer/gi/consts'
import type { CharacterSheet, WeaponSheet } from '@genshin-optimizer/gi/sheets'
import type { UIData } from '@genshin-optimizer/gi/uidata'
import type { Data } from '@genshin-optimizer/gi/wr'

export type TeamData = Partial<
  Record<
    CharacterKey,
    {
      target: UIData
      buffs: Dict<CharacterKey, UIData>
      character: ICachedCharacter
      weapon: ICachedWeapon
      characterSheet: CharacterSheet
      weaponSheet: WeaponSheet
      totalArt: Data
      weaponData: Data
      charData: Data
    }
  >
>

export type CharBundle = {
  character: ICachedCharacter
  weapon: ICachedWeapon
  characterSheet: CharacterSheet
  weaponSheet: WeaponSheet
  totalArt: Data
  weaponData: Data
  charData: Data
}

export type TeamDataBundle = {
  teamData: Dict<CharacterKey, Data[]>
  teamBundle: Dict<CharacterKey, CharBundle>
}

export function getTeamDataCalc(
  database: ArtCharDatabase,
  teamId: string | '',
  gender: GenderKey,
  teamCharId?: string,
  mainStatAssumptionLevel?: number,
  overrideArt?: ICachedArtifact[] | Data,
  overrideWeapon?: ICachedWeapon,
  overrideChar?: ICachedCharacter
): TeamData | undefined

export function getTeamData(
  database: ArtCharDatabase,
  teamId: string | '',
  teamCharId?: string,
  mainStatAssumptionLevel?: number,
  overrideArt?: ICachedArtifact[] | Data,
  overrideWeapon?: ICachedWeapon,
  overrideChar?: ICachedCharacter
): TeamDataBundle | undefined

export function getBuildTcArtifactData(
  modelArts: Record<ArtifactSetKey, 1 | 2 | 4>,
  mainStatKeys: Record<ArtifactSlotKey, MainStatKey>,
  substats: Record<SubstatKey, number>
): Data

export function getBuildTcWeaponData(weapon: {
  key: WeaponKey
  level: number
  ascension: AscensionKey
  refinement: RefinementKey
}): Data
```

---

## 3. Prebuilt Bundle Outputs (`packages/engine/scripts/build-engine.mjs`)

| Artifact Path | Format | Platform | Target | Consumer | Budget / Size |
|---|---|---|---|---|---|
| `apps/web/public/workers/optimizer.worker.js` | `iife` (minified, tree-shaken) | `browser` | `es2022` | `new Worker('/workers/optimizer.worker.js')` in `apps/web/src/lib/engine/workerClient.ts` | `≤ 1.2 MB` raw (`~1.00 MB` raw / `~336 KB` gzip) |
| `packages/engine/dist/index.mjs` | `esm` (minified, tree-shaken) | `neutral` / `browser` | `es2022` | `@gi/engine` package entry (`"main": "./dist/index.mjs"`) | `~1.00 MB` raw |
| `packages/engine/dist/gi-consts.mjs` | `esm` (minified, tree-shaken) | `neutral` / `browser` | `es2022` | `apps/web/next.config.ts` alias for `@genshin-optimizer/gi/consts` | `~14 KB` raw |

