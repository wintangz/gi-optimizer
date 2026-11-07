# Research: Buff Coverage Fixes (`buff-coverage-fixes`)

## Decision 1: Citlali TTDS & Xilonen/Zhongli Archaic Petra in Official Presets
- **Decision**:
  1. In `packages/presets/data/official/mavuika-melt-hypercarry.json`:
     - Add `"ThrillingTalesOfDragonSlayers": { "Heritage": "on" }` to Citlali's `conditional` (`team[1].conditional`).
     - Add `"ArchaicPetra": { "ele": "pyro", "element": "pyro" }` to Xilonen's `conditional` (`team[2].conditional`).
  2. In `packages/presets/data/official/furina-salon-subdps.json`:
     - Add `"ArchaicPetra": { "ele": "hydro", "element": "hydro" }` to Zhongli's `conditional` (`team[3].conditional`).
  3. In `hydratePresetTeam` (`packages/engine/src/session.ts`):
     - When a member's `conditional.ArchaicPetra` specifies `ele` without `element` on a non-Akasha preset (or custom preset), copy `ele` to `element` so `ArchaicPetra: { ele: '<ele>' }` also activates GO's `cond('ArchaicPetra', 'element')` node while keeping `official/neuvillette-hypercarry` and all `akasha/*` golden fixtures 100% byte-identical.
- **Rationale**:
  - In `vendor/genshin-optimizer/libs/gi/sheets/src/Weapons/Catalyst/ThrillingTalesOfDragonSlayers/index.tsx` (line 21), the R5 +48% ATK buff is gated by `cond('ThrillingTalesOfDragonSlayers', 'Heritage') === 'on'`.
  - In `vendor/genshin-optimizer/libs/gi/sheets/src/Artifacts/ArchaicPetra/index.tsx` (line 24), the 4pc +35% elemental DMG buff is gated by `cond('ArchaicPetra', 'element') === '<ele>'`. Setting both `"ele"` and `"element"` in `official/furina-salon-subdps.json` and `official/mavuika-melt-hypercarry.json` satisfies both the preset JSON `ele` key convention and GO's `element` sheet key, and ensures `computeDirectGOGolden` in `packages/engine/scripts/capture-golden.ts` and `session.exportGODatabase` round-trip match with zero divergence.

## Decision 2: Owned-Target Weapon Swap Conditional Auto-Population
- **Decision**:
  - In `session.evaluate`, `session.optimize`, and `hydrateTeamIntoDb` (`packages/engine/src/session.ts`), resolve `overrideWeapon` from `selection?.weaponId` / `opts?.weaponId` (`baseDb.weapons.get(weaponId)`) BEFORE calling `hydratePresetTeam`, and pass `effectiveWeaponSpec?.key ?? overrideWeapon?.key` as `activeWeaponKey` into `hydratePresetTeam`.
  - In `hydratePresetTeam`, remove the `member.build.type === 'fixed'` restriction on weapon conditional auto-population so any target (`isTarget`) with an explicit `resolvedWeaponKey` (from `activeWeaponKey` or `targetMember.build.weapon.key` when `fixed`) auto-populates `resolvedWeaponKey`'s conditionals to their max state (`wc.states[wc.states.length - 1].key`) whenever `!memberConditional[resolvedWeaponKey]`.
- **Rationale**:
  - Generalizes the exact Akasha fixed-target weapon conditional auto-population to `'owned'` targets whenever an explicit weapon choice (`weaponId` or `weaponOverride`) is provided, while never overriding explicitly authored weapon conditionals and never altering default golden fixture evaluations where no weapon swap is requested.

## Decision 3: Target Boolean Artifact-Set Conditionals Default to `'on'`
- **Decision**:
  - Export `listBooleanArtifactSetConditionals()` from `packages/engine/src/catalog.ts` (using the cached `GlobalConditionalBuckets.artifactConditionals`), returning a map `Record<string, Record<string, 'on'>>` of all artifact-set conditionals where `c.states.length === 1 && c.states[0]?.key === 'on'` (excluding multi-path element selectors such as `ScrollOfTheHeroOfCinderCity`'s `react_*`).
  - In `hydratePresetTeam` (`packages/engine/src/session.ts`), for the target member (`isTarget`, `i === 0`), for each `[setKey, defaultStates]` in `listBooleanArtifactSetConditionals()`, if `!member.conditional[setKey]` (the preset did not explicitly author a conditional entry for `setKey`), set `memberConditional[setKey] = defaultStates`.
- **Rationale**:
  - Because `hydratePresetTeam` is shared by `session.evaluate`, `session.optimize`, and `session.exportGODatabase`, target boolean set conditionals apply identically in current-build evaluation and solver optimization. Stack/ranged/numeric conditionals (`states.length > 1` or numeric keys like `'70'`, `'50'`, `'1'..'5'`) are untouched.

## Decision 4: Custom Preset Defaults (Resonance Fill & Default TC Teammate Conditional)
- **Decision**:
  1. In `hydratePresetTeam` (`packages/engine/src/session.ts`):
     - Tally element occurrences across `preset.team` (up to 4 members) via `getCharStat(mKey).ele`.
     - For any element `ele` appearing 2+ times, if neither `preset.teamConditional?.resonance?.[ele]` nor `preset.teamConditional?.resonance?.[CapEle]` is specified, set `effectiveResonance[CapEle] = 'on'` and `effectiveResonance[ele] = 'on'`.
     - When an element with 2+ members has effective resonance `'on'`, also populate GO's conditional resonance keys (`ShatteringIce: 'on'` for Cryo, `EnduringRock: 'on'` & `EnduringRockHit: 'on'` for Geo, `SprawlingCanopy2ele: 'on'` & `SprawlingCanopy3ele: 'on'` for Dendro) if not already specified.
  2. In `getCharDataBundle` (`packages/engine/src/teamData.ts`):
     - Inspect `charInfo.conditional?.resonance`: if an element's resonance is explicitly disabled (set to a value other than `'on'`, e.g. `'off'`), filter that element's buff out of `resonanceData` so toggling resonance `'on'` vs `'off'` in a double-element team moves the total for all elements (including Pyro `+25% ATK` and Hydro `+25% HP`, which GO's `Resonance.tsx` otherwise treats as unconditional).
  3. In `packages/presets/src/userPreset.ts` and `apps/web/src/app/teams/page.tsx`:
     - Export `DEFAULT_TC_TEAMMATE_CONDITIONAL = { NoblesseOblige: { set4: 'on' } }` and `createDefaultTcTeammate(characterKey)` in `packages/presets/src/userPreset.ts`, and populate `{ NoblesseOblige: { set4: 'on' } }` when adding or switching a teammate to the default TC template in `apps/web/src/app/teams/page.tsx`.
- **Rationale**:
  - Bundled presets already author their `teamConditional.resonance` (and Raiden's double-Electro has no stat buff in Genshin), so all 9 untouched golden fixtures remain byte-identical, while custom double-element teams automatically receive their elemental resonance buff and default 4pc Noblesse Oblige support buff.
