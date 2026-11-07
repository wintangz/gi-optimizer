# Research: Official Presets Owned-First Teammate Resolution (`official-presets-owned-first`)

## 1. Ownership Detection in `ArtCharDatabase` vs Raw GOOD JSON

- **Finding**: In `packages/engine/src/session.ts`, `hydratePresetTeam` calls `if (!db.chars.get(mKey)) db.chars.getWithInitWeapon(mKey)` so Genshin Optimizer's `TeamData` constructor does not fail when a preset references a character not in the user's GOOD file. Calling `db.chars.getWithInitWeapon(mKey)` mutates `db.chars` by inserting a default Lv.1 C0 character with a 1★ weapon.
- **Decision**: Track the true set of GOOD-imported character keys (`goodCharKeys`) from `good.characters` before any `getWithInitWeapon` call (and cache it per `ArtCharDatabase` instance in a `WeakMap<object, ReadonlySet<string>>`). A character is considered owned by the user if and only if `goodCharKeys.has(mKey)`.

## 2. Conditional Derivation for Owned vs Simulated Teammates

- **Finding**: For an owned target (`isTarget`), `hydratePresetTeam` currently populates:
  1. `getDefaultTargetArtifactSetConditionals()` — all single-state boolean artifact-set conditionals defaulted to `'on'` (which GO only activates if the character's equipped artifacts satisfy the 2pc/4pc requirement).
  2. `listWeaponConditionals(equippedWeaponKey)` — all weapon sheet conditionals for the character's equipped weapon set to their last (maximum) state (`wc.states[wc.states.length - 1].key`).
- **Decision**: When an official preset's non-target member (`i > 0`) resolves to `'owned'`, preset-authored `member.conditional` is ignored (as it describes the simulated TC build only, e.g., Archaic Petra on Zhongli/Xilonen when the user's GOOD Zhongli wears Tenacity of the Millelith and Xilonen wears Scroll of the Hero of Cinder City). Instead, `memberConditional` is constructed from `getDefaultTargetArtifactSetConditionals()` plus max-state `listWeaponConditionals(equippedWeaponKey)` for `db.weapons.get(db.chars.get(mKey)?.equippedWeapon)?.key`. When the member resolves to `'tc'`, `memberConditional` uses `member.conditional` (plus the `ArchaicPetra` `ele -> element` bridge).

## 3. Sample GOOD Dataset (`Van_2025-07-16_19-59-13.json`) Coverage of Bundled Official Presets

- **Finding**: All 14 unique characters across the 6 bundled official presets (`Furina`, `Neuvillette`, `KaedeharaKazuha`, `Zhongli`, `Mavuika`, `Citlali`, `Xilonen`, `Bennett`, `HuTao`, `Yelan`, `Xingqiu`, `RaidenShogun`, `KujouSara`, `Arlecchino`) exist in `Van_2025-07-16_19-59-13.json`. Therefore, under default settings on `Van_2025-07-16_19-59-13.json`, all non-target teammates in the 6 bundled official presets resolve to `'owned'`, and toggling all non-target teammates to `'tc'` reproduces the exact previous golden totals.
