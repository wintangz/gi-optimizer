// Type boundary for the vendored Genshin Optimizer source.
//
// GO is compiled from source by Vite/webpack (see tooling/go-paths.mjs), but it
// is authored for TypeScript 6 + React 18 types, so our tsc must not typecheck
// it. Every `@genshin-optimizer/*` import is therefore declared below so named
// type and value imports both resolve cleanly under TypeScript 5.

declare module '@genshin-optimizer/common/database' {
  export const SandboxStorage: any
  export type SandboxStorage = any
}

declare module '@genshin-optimizer/common/util' {
  export function notEmpty<T>(value: T | null | undefined | false | ''): value is T
  export const objKeyMap: any
  export const clamp: any
}

declare module '@genshin-optimizer/gi/consts' {
  export type ArtifactSetKey = string
  export type ArtifactSlotKey = 'flower' | 'plume' | 'sands' | 'goblet' | 'circlet'
  export type CharacterKey = string
  export type LocationCharacterKey = string
  export type WeaponKey = string
  export type MainStatKey = string
  export type SubstatKey = string
  export const allAdditiveReactions: readonly string[]
  export const allAmpReactionKeys: readonly string[]
  export const allArtifactSetKeys: readonly ArtifactSetKey[]
  export const allArtifactSlotKeys: readonly ArtifactSlotKey[]
  export const allCharacterKeys: readonly CharacterKey[]
  export const allElementWithPhyKeys: readonly string[]
  export const allInfusionAuraElementKeys: readonly string[]
  export const allLocationCharacterKeys: readonly LocationCharacterKey[]
  export const allMainStatKeys: readonly MainStatKey[]
  export const allMultiOptHitModeKeys: readonly string[]
  export const allSubstatKeys: readonly SubstatKey[]
  export const allTravelerKeys: readonly CharacterKey[]
  export const allWeaponKeys: readonly WeaponKey[]
  export const artMaxLevel: Record<number, number>
  export const artSlotMainKeys: Record<ArtifactSlotKey, readonly MainStatKey[]>
  export function charKeyToLocCharKey(charKey: CharacterKey): LocationCharacterKey
}

declare module '@genshin-optimizer/gi/db' {
  export type ArtCharDatabase = any
  export const ArtCharDatabase: any
  export type ArtSetExclusion = Record<string, any>
  export type CustomMultiTarget = any
  export type CustomTarget = any
  export type ICachedArtifact = any
  export type ICachedCharacter = any
  export type ICachedWeapon = any
  export type LoadoutDatum = any
}

declare module '@genshin-optimizer/gi/sheets' {
  export type DocumentSection = any
  export const getArtSheet: any
  export const getCharSheet: any
  export const getWeaponSheet: any
  export const reactionConditionals: any
  export const resonanceSheets: any
}

declare module '@genshin-optimizer/gi/stats' {
  export const allStats: any
  export const getCharEle: any
  export const getCharStat: any
  export const getArtSetStat: any
  export const getWeaponStat: any
}

declare module '@genshin-optimizer/gi/ui/useTeamData' {
  export const getTeamData: any
  export const getTeamDataCalc: any
}

declare module '@genshin-optimizer/gi/uidata' {
  export type UIData = any
  export const UIData: any
  export const uiDataForTeam: any
}

declare module '@genshin-optimizer/gi/wr' {
  export type NumNode = any
  export type CalcResult = any
  export type Data = any
  export const dynamicData: any
  export const input: any
  export const mergeData: any
  export const optimize: any
}

declare module '@genshin-optimizer/gi/solver' {
  export type OptProblemInput = any
  export const artSetPerm: any
  export const countBuilds: any
  export const filterArts: any
  export const filterFeasiblePerm: any
  export const pruneAll: any
  export const pruneExclusion: any
}

declare module '@genshin-optimizer/gi/solver-tc' {
  export const compactArtifacts: any
}

declare module '@genshin-optimizer/gi/solver/BNBSplitWorker' {
  export type BNBSplitWorker = any
  export const BNBSplitWorker: any
}

declare module '@genshin-optimizer/gi/solver/ComputeWorker' {
  export type ComputeWorker = any
  export const ComputeWorker: any
}

declare module '@genshin-optimizer/gi/solver/DefaultSplitWorker' {
  export type DefaultSplitWorker = any
  export const DefaultSplitWorker: any
}

declare module '@genshin-optimizer/*'

