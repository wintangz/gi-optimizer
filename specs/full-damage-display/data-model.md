# Data Model: Full Damage Display (`full-damage-display`)

**Feature**: `full-damage-display`  
**Date**: 2026-11-09

## 1. Engine Types (`packages/engine/src/types.ts`)

```ts
export interface FullDamageFormulaEntry {
  /** Formula key within its section (e.g. '0', 'dmg', 'high', 'overloaded'). */
  key: string
  /** Section key in GO sheet display (e.g. 'normal', 'charged', 'plunging', 'skill', 'burst', 'reaction'). */
  sectionKey: string
  /** Full 2-tuple GO display path: `[sectionKey, key]`. */
  path: [string, string]
  /** Human-readable formula label (e.g. '1-Hit DMG', 'High Plunge DMG', 'Overloaded DMG'). */
  label: string
  /** Evaluated per-hit / formula damage value under this build. */
  value: number
  /** Resolved damage element or variant (e.g. 'electro', 'pyro', 'physical', 'heal', 'lunarcrystallize'). */
  element: string
  /** Resolved move category (e.g. 'normal', 'charged', 'plunging_impact', 'skill', 'burst', 'reaction'). */
  move: string
  /** Effective hit mode ('avgHit' | 'critHit' | 'hit'). */
  hitMode: string
  /** Active amplifying/additive reaction on the hit, if any. */
  reaction?: string
  /** Multiplicative factor breakdown reconcilable with `value`. */
  breakdown: DamageRowBreakdown
}

export interface FullDamageSection {
  /** Section key in GO sheet order (e.g. 'normal', 'charged', 'plunging', 'skill', 'burst', 'passive1', 'constellation6', 'reaction'). */
  sectionKey: string
  /** Human-readable section title (e.g. 'Normal Attack', 'Elemental Burst', 'Transformative Reactions'). */
  label: string
  /** Active (non-empty) flat damage/formula entries in sheet definition order. */
  formulas: FullDamageFormulaEntry[]
}
```

### Extension to `RotationResult`

```ts
export interface RotationResult {
  total: number
  instances: InstanceResult[]
  stats: Record<string, number>
  statBreakdowns?: Record<string, StatBreakdown>
  memberStats?: Record<string, MemberStatSummary>
  /** Complete character damage formula list grouped by talent/source section in sheet order. */
  fullDamage?: FullDamageSection[]
}
```
