# Feature Specification: Buffs & Passives Human-Readable Labels (`buff-panel-labels`)

**Feature Branch**: `main`  
**Created**: 2026-11-07  
**Status**: Approved  
**Input**: User description: "The panel's row labels are raw engine conditional keys (hpChange, otherHpChange, numOffer, fanfarePoints, charOffField, c2Points, afterUse.skill). Show human-readable effect names instead: Source the labels from GO's own conditional metadata in the vendored submodule (the names/descriptions GO's UI uses for these conditionals), surfaced through the engine's conditional catalogue — NOT a hand-maintained per-character list in the web app. If a conditional has no user-facing name in GO's data, fall back to a prettified key (camelCase split, capitalised) rather than the raw key. Keep the raw key visible in a tooltip (title) on the label, for debugging. Display only: no change to conditional keys, values, state, or how overrides apply."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Human-Readable Conditional Labels from GO Metadata (Priority: P1)

When viewing the Buffs & Passives panel (`ConditionalTogglePanel`), users see human-readable effect names (sourced from Genshin Optimizer's conditional metadata and English localization in the vendored submodule via `packages/engine/src/catalog.ts`) instead of raw engine conditional keys such as `hpChange`, `otherHpChange`, `numOffer`, `fanfarePoints`, `charOffField`, `c2Points`, or `afterUse.skill`.

**Why this priority**: Raw engine identifiers like `numOffer` or `otherHpChange` are opaque to players and require familiarity with Genshin Optimizer's internal sheet keys to understand what buff is being toggled.

**Independent Test**: Call `listConditionalsForCharacter` / `listWeaponConditionals` and render `ConditionalTogglePanel` for characters, weapons, and artifact sets (e.g., Furina, Splendor of Tranquil Waters, Golden Troupe, Yae Miko); verify that row labels display human-readable GO conditional names rather than raw keys.

**Acceptance Scenarios**:

1. **Given** a character, weapon, or artifact set conditional in GO's sheets (such as `SplendorOfTranquilWaters`'s `hpChange` and `otherHpChange`, `Furina`'s `numOffer`, `fanfarePoints`, and `c2Points`, `GoldenTroupe`'s `set4`, or conditionals using `st('afterUse.skill')`), **When** `listConditionalsForCharacter` / `listWeaponConditionals` builds `ConditionalDescriptor` entries, **Then** `descriptor.name` resolves the human-readable GO label from GO's conditional section metadata (`sec.name`, single-state `states[key].name`, `sec.header.title`) and GO's English locale strings.
2. **Given** `ConditionalTogglePanel` rendering those descriptors, **When** a conditional row is displayed, **Then** the visible label shows the human-readable effect name rather than the raw conditional key.

---

### User Story 2 - Prettified Key Fallback & Raw Key Debugging Tooltip (Priority: P1)

When a conditional has no user-facing name in GO's metadata (or a custom/synthetic descriptor only provides a raw key), the label falls back to a prettified key (camelCase / dot / underscore split and Title-Cased) rather than displaying the raw key verbatim. Every conditional label keeps the raw conditional key visible in its HTML `title` tooltip for debugging.

**Why this priority**: Guarantees no raw camelCase/dot-path identifier ever leaks into the visible UI text while preserving developer/TC inspectability via hover tooltips.

**Independent Test**: Pass a conditional descriptor without a user-facing GO name (or inspect the `title` attribute on any rendered `.gi-buff-row-label`); verify the text is prettified and `title` contains the raw conditional key.

**Acceptance Scenarios**:

1. **Given** a conditional with no user-facing name in GO's data (or a descriptor whose name equals its raw key, e.g., `customBuffKey` or `afterUse.skill`), **When** rendered, **Then** the label falls back to a prettified human-readable string (`Custom Buff Key`, `After Use: Skill`) rather than the raw key.
2. **Given** any conditional rendered in `ConditionalTogglePanel`, **When** inspecting its `.gi-buff-row-label` element, **Then** its `title` attribute includes the raw conditional key (`cond.key`).
3. **Given** any user interaction with toggles or multi-state selectors, **When** overrides are applied or reset, **Then** conditional keys, state keys, effective values, and override persistence behave identically to before.

### Edge Cases

- **Single-state boolean conditionals where `sec.name` is omitted**: In GO sheets, single-state conditionals (`states: { on: { name: ..., fields: [...] } }`) often omit `sec.name` and place the conditional label on `states.on.name` (or `sec.header.title`). The catalogue extractor must check `sec.name`, then the single state's `.name`, then `sec.header.title`.
- **`<Translate ns={...} key18={...} values={...} />` elements**: GO sheet helpers (`st`, `stg`, `tr`, `trm`, `ch`, `chg`) emit `<Translate>` elements referencing GO's `locales/en/*.json` (`sheet.json`, `sheet_gen.json`, `char_<Key>.json`, `char_<Key>_gen.json`, `weapon_<Key>.json`, `weapon_<Key>_gen.json`, `artifact_<Key>_gen.json`). The catalogue must resolve these against GO's vendored English localization data, interpolate `{{...}}` placeholders, and strip `<0>...</0>` / `<color>` markup tags.
- **State labels in multi-state dropdowns**: Multi-state option labels (`ConditionalStateDescriptor.name`) that use `<Translate>` (e.g., `st('stack', { count: 1 })` -> `"1 Stack"`) also benefit from resolving against GO's English localization instead of showing raw `key18` strings.
- **Worker bundle size budget**: `optimizer.worker.js` has a strict `< 1.2 MB` raw size budget in `packages/engine/scripts/build-engine.mjs`. Localization resolution must only bundle the compact dictionary of conditional/header strings referenced by GO sheets (or pre-extracted at build/load time), keeping `optimizer.worker.js` well under budget.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `packages/engine/src/catalog.ts` MUST resolve human-readable conditional names (and state names) from GO's vendored sheet metadata (`sec.name`, single-state `states[onlyKey].name`, `sec.header.title`) and GO's vendored English localization files (`vendor/genshin-optimizer/libs/gi/localization/assets/locales/en` and `vendor/genshin-optimizer/libs/gi/dm-localization/assets/locales/en`), without modifying `vendor/genshin-optimizer`.
- **FR-002**: No hand-maintained per-character conditional label list may be added to `apps/web`; labels MUST flow from GO's submodule metadata through `@gi/engine`'s conditional catalogue.
- **FR-003**: If a conditional has no user-facing name in GO's data, both `packages/engine/src/catalog.ts` and `apps/web/src/components/ConditionalTogglePanel.tsx` MUST fall back to a prettified key (splitting camelCase, dots, and underscores and capitalising words) rather than rendering the raw key.
- **FR-004**: `ConditionalTogglePanel` MUST include the raw conditional key (`cond.key`) in the `title` tooltip attribute on `.gi-buff-row-label` for debugging.
- **FR-005**: Display-only change: conditional keys, state keys, default values, override storage, and damage evaluation MUST remain completely unchanged.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Known raw conditional keys from the prompt (`hpChange`, `otherHpChange`, `numOffer`, `fanfarePoints`, `charOffField`, `c2Points`, `afterUse.skill`) resolve to human-readable labels in `listConditionalsForCharacter` / `listWeaponConditionals` and `ConditionalTogglePanel`.
- **SC-002**: Every conditional label in `ConditionalTogglePanel` exposes its raw `cond.key` in the `title` tooltip.
- **SC-003**: `optimizer.worker.js` remains well below the 1.2 MB raw bundle budget, and all unit/integration tests pass.

## Assumptions

- For single-state conditionals where `sec.name` is undefined, `states[onlyKey].name` is preferred first because in GO's UI a single-state conditional renders its toggle button with `state.name` as the button label inside the section; if `states[onlyKey].name` is also absent or generic, `sec.header.title` is used before falling back to `prettifyConditionalKey(key)`.
- GO localization strings containing color/tag wrappers like `<cryo>Cryo</cryo>` or `<0>text</0>` have those tags stripped so plain text renders cleanly in the UI.
