# Research: Team-Wide Conditional Buffs & Passives Toggle Panel (`conditional-toggle-panel`)

## 1. Categorizing GO Sheet Conditionals (`weapon` / `artifact` / `character` / `constellation`)

- **Finding**: In `vendor/genshin-optimizer/libs/gi/sheets/src/Characters/charTemplates.tsx`, `ct.condTem(talentKey, ...)` attaches `header.action = <SqBadge>{st('talents.' + talentKey)}</SqBadge>` to every character conditional section, even when a constellation conditional is embedded inside `skill` or `burst` (e.g. `Furina` `c2Overstack` inside `burst`, `c6` and `c6Pneuma` inside `skill`).
- **Decision**: In `packages/engine/src/catalog.ts`, inspect both the outer `charSheet.sheet` key and `extractReactNodeText(sec.header?.action, '')` (plus `/^c[1-6](?:[A-Z0-9_p]|$)/` on `sec.path[1]`). Any conditional associated with `constellation1..6` gets `category: 'constellation'`; other `charSheet.sheet` conditionals get `category: 'character'`; `allWeaponKeys` conditionals get `category: 'weapon'`; `allArtifactSetKeys` conditionals get `category: 'artifact'`.

## 2. Legacy Preset Conditional Key Aliases vs GO Sheet Keys

- **Finding**: A few bundled presets author legacy alias keys in `member.conditional`:
  - `GoldenTroupe.offField` (GO sheet key: `GoldenTroupe.set4`)
  - `MarechausseeHunter.stacks` (GO sheet key: `MarechausseeHunter.set4`)
  - `ObsidianCodex.set2` / `set4` (GO sheet keys: `ObsidianCodex.2NightsoulBlessing` / `4NightsoulConsume`)
  - `ArchaicPetra.ele` (GO sheet key: `ArchaicPetra.element`)
  - `Zhongli.nearShield` (GO sheet key: `Zhongli.skill`)
- **Decision**: `readEffectiveConditionalValue` checks the canonical GO catalog key first and falls back to the known alias when reading effective state, while `applyMemberConditionalOverrides` updates/cleans up both the canonical key and its alias when the user overrides that conditional. When no override is present for that conditional, the base map is untouched so all golden fixtures remain 100% byte-identical.
