# Data Model: Preset Conditional GO Alignment (`preset-conditional-go-alignment`)

## 1. `PresetConditionalIssue` (`@gi/engine`)

```ts
export interface PresetConditionalIssue {
  /** JSON path inside the preset (e.g., `team.0.conditional.GoldenTroupe.offField` or `teamConditional.resonance.Hydro`). */
  path: string
  /** Human-readable explanation of why the sheet, key, or value failed validation against the GO conditional catalogue. */
  message: string
}
```

## 2. `validatePresetConditionalsAgainstGO(preset: Preset): PresetConditionalIssue[]` (`@gi/engine`)

Validates all conditional entries in a `Preset` against the authoritative GO conditional catalogue (`listConditionalsForCharacter`, `listWeaponConditionals`, and global artifact/resonance/reaction buckets):

1. **`preset.team[i].conditional` (`0 <= i < preset.team.length`)**:
   - Builds the valid conditional lookup for member `preset.team[i].key` from `listConditionalsForCharacter(member.key)` (plus all GO weapon conditionals across `allWeaponKeys` so weapon sheets authored on any member are validated against their exact GO weapon sheet).
   - For each `[sheetKey, sheetMap]` in `Object.entries(member.conditional)`:
     - Verifies `sheetKey` exists in the GO conditional catalogue.
     - For each `[condKey, condVal]` in `Object.entries(sheetMap)`:
       - Verifies `(sheetKey, condKey)` exists in the GO conditional catalogue.
       - Verifies `condVal` is a member of `descriptor.states.map(s => s.key)` (disallowing `'off'` or unknown state strings in authored preset conditionals).
2. **`preset.teamConditional.resonance`**:
   - Validates each `[condKey, condVal]` against GO's `resonance` sheet conditionals (`ShatteringIce`, `EnduringRock`, `EnduringRockHit`, `SprawlingCanopy2ele`, `SprawlingCanopy3ele`).
3. **`preset.teamConditional.reaction`**:
   - Validates each `[condKey, condVal]` against GO's `reaction` sheet conditionals (`superconduct`, `oppInsidePole`, `polestarStacks`).
