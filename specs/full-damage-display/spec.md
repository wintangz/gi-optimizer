# Feature Specification: Full Damage Display (`full-damage-display`)

**Feature Directory**: `specs/full-damage-display`  
**Created**: 2026-11-09  
**Status**: Approved  
**Input**: User description: "Feature: full-damage-display. Full Spec Kit flow, autonomous; log assumptions, don't ask. One commit: feat: full-damage-display, push when done."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Engine Extracts Target Character's Complete Damage Formula List & Breakdowns (Priority: P1)

As a user optimizing or inspecting builds in GI Optimizer, I need the calculation engine to compute the target character's complete damage formula list (`fullDamage`) from their sheet data (`normal`, `charged`, `plunging`, `skill`, `burst`, passives, constellations, equipped weapon/artifact passive hits, and `reaction` entries) for any displayed build (`current` build and result builds), with each formula's damage value and expandable `DamageRowBreakdown` under that build, while leaving the rotation objective and solver speed completely unchanged.

**Why this priority**: Engine extraction of `fullDamage` on `RotationResult` provides the exact GO-evaluated values, section ordering, `isEmpty` filtering, and per-formula breakdowns required by all build views and acceptance tests.

**Independent Test**: Optimize any preset whose rotation is narrow (e.g., burst-focused `official/raiden-national` or skill-focused `official/furina-salon-subdps`); verify that the best build's `evaluation.fullDamage` includes formulas NOT in the rotation (e.g., `normal.0`, `normal.1`, `charged.dmg`, `plunging.high`, `reaction.*`) with real values, that each formula's value matches a direct `session.evaluate()` of a single-target rotation for that formula and build, that untriggerable (`isEmpty === true`) formulas are omitted as GO does, and that rotation totals and golden snapshots remain byte-identical.

**Acceptance Scenarios**:

1. **Given** a preset whose rotation is narrow (e.g., burst-focused `official/raiden-national` or skill-focused `official/furina-salon-subdps`), **When** optimizing or evaluating the current/best build, **Then** `evaluation.fullDamage` contains sections in sheet order (`normal`, `charged`, `plunging`, `skill`, `burst`, active passives/constellations, `reaction`) including formulas not in the rotation (such as `normal.0`, `normal.1`, `charged.dmg`, `plunging.high`, and triggerable transformative/lunar reactions) with positive finite damage values.
2. **Given** any formula entry in `evaluation.fullDamage` for a build, **When** evaluating a synthetic single-target rotation pointing directly to `path: [sectionKey, formulaKey]` (with the character's default `hitMode`, `reaction`, and `infusionAura`) for that same build via `session.evaluate()`, **Then** the formula entry's `value` matches the direct engine evaluation (`Math.abs(entry.value - directEval.total) < 1e-6`).
3. **Given** formulas that the current build/context cannot trigger (such as infusion-gated reactions in `display.reaction` when the character lacks that elemental infusion, constellation-gated formulas when the character is at a lower constellation, ascension-gated formulas below the required ascension, or unequipped weapon/artifact formulas), **When** `targetUiData.getDisplay()` evaluates them with `node.isEmpty === true`, **Then** those untriggerable formulas (and any sections whose formulas are all `isEmpty`) are omitted from `fullDamage`, matching GO's `StatDisplayComponent` / `FieldDisplay` / `FormulaModal` behavior.
4. **Given** a character with an active elemental infusion (e.g., `infusionAura: 'pyro'`) or higher constellation (e.g., C6), **When** evaluating `fullDamage`, **Then** the newly triggerable formulas (`isEmpty === false`, such as Pyro infusion reactions `burning`/`overloaded`/`burgeon` or C6 hits) appear in `fullDamage`.
5. **Given** any formula entry in `evaluation.fullDamage`, **When** inspecting `entry.breakdown`, **Then** it provides a valid `DamageRowBreakdown` whose `reconciledPerHit` reconciles with `entry.value`.

---

### User Story 2 - UI Renders Expandable "Full Damage" Section Grouped by Talent Source in Sheet Order (Priority: P1)

As a user inspecting a build in Stage 5 (Build Details across Single-Character, Weapon Comparison, and Team Optimization modes), I want a `"Full Damage"` section in the expanded build details area, grouped by talent source in sheet order (`Normal Attack`, `Charged Attack`, `Plunging Attack`, `Elemental Skill`, `Elemental Burst`, passives/constellations, `Transformative Reactions`), where each row shows its damage under that build (and delta vs. Current build when applicable) and expands on click to the same `DamageRowBreakdownView` as rotation rows.

**Why this priority**: Delivers the user-facing GO-style full damage view so users can inspect every talent hit and reaction for any displayed build, not only the rotation's picked hits.

**Independent Test**: Render `BuildComparisonList`, `WeaponComparisonList`, and `TeamOptimizationList` with evaluated builds containing `fullDamage`; verify that the `"Full Damage"` section renders groups in sheet order, displays non-rotation formulas with their values and vs.-Current deltas, and expands any clicked formula row to render `DamageRowBreakdownView`.

**Acceptance Scenarios**:

1. **Given** an expanded build row in `BuildComparisonList` (Current or `#1..#5`), `WeaponComparisonList`, or `TeamOptimizationList`, **When** viewing the build details panel, **Then** a `"Full Damage"` section is rendered below the Per-Instance Rotation Breakdown, grouped by talent source in sheet order.
2. **Given** any formula row in `"Full Damage"`, **When** the user clicks the row (or its chevron toggle), **Then** the row expands inline to display `DamageRowBreakdownView` with the formula's multiplicative equation bar and factor breakdown cards.
3. **Given** an optimized build row in `BuildComparisonList` with a `currentBuild` baseline, **When** viewing `"Full Damage"`, **Then** each formula row also displays its relative delta (`vs. Current`) compared to the same `[sectionKey, formulaKey]` in `currentBuild.evaluation.fullDamage`.

---

### Edge Cases

- **Untriggerable Formulas (`node.isEmpty === true`)**: In GO (`UIData._match` and `UIData._threshold` in `vendor/genshin-optimizer/libs/gi/uidata/src/uiData.ts`), any formula gated by an unmet condition (such as non-native reactions in `display.reaction` requiring an elemental infusion, locked constellation/ascension hits, inactive conditional hits, or unequipped weapon/artifact passive hits) evaluates with `node.isEmpty === true`. Matching GO (`StatDisplayComponent.tsx`, `FieldDisplay.tsx`, `FormulaModal.tsx`), any node with `node.isEmpty === true` or `value === 0` / non-finite is omitted, and any section with zero remaining formulas is omitted.
- **Percentage Stat Buff Nodes in `dmgFormulas`**: Some GO character sheets place `%`-unit stat buff nodes in `dmgFormulas` (e.g., Raiden's `skill.skillEye_` (`burst_dmg_`) and `passive2.passive2ElecDmgBonus` (`electro_dmg_`), or Furina's `passive2.member_dmg_`). Matching GO's `TargetSelectorModal.tsx` (`flatOnly: true`), percentage-unit nodes (`unit === '%'`, `path` ending in `_`, or key ending in `_`) are filtered out of `fullDamage` because they are stat modifiers (already displayed in `Real Stats` / `Additional Buffs`), not damage/hit formulas.
- **Transformative / Lunar / Stellar Reactions Without `hit.base`**: Reaction formulas in `display.reaction` (and direct Lunar/Stellar reaction nodes using `specialReactionDmgNode`) do not populate `input.hit.base`. `extractFormulaBreakdown` constructs a 6-factor `DamageRowBreakdown` using the character/reaction element's `resMulti` (`input.enemy[${ele}_resMulti_]`) and effective `critMulti` so every row in `"Full Damage"` is expandable to `DamageRowBreakdownView` and reconciles `reconciledPerHit === value`.
- **Solver Performance**: `GOSolver` / `BackgroundWorker` never calls `session.evaluate()` during branch-and-bound solving. `session.evaluate()` is called only for displayed builds (current build + top N result builds), where `targetUiData.getDisplay()` is already computed; extracting `fullDamage` from the already-computed `display` object adds `< 1 ms` per displayed build and zero overhead to the solver.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `RotationResult` in `packages/engine/src/types.ts` MUST include `fullDamage?: FullDamageSection[]`, where each `FullDamageSection` has `{ sectionKey, label, formulas: FullDamageFormulaEntry[] }` in GO sheet order, and each `FullDamageFormulaEntry` has `{ key, sectionKey, path: [sectionKey, key], label, value, element, move, hitMode, reaction, breakdown: DamageRowBreakdown }`.
- **FR-002**: `extractFullDamageSections` in `packages/engine/src/breakdown.ts` MUST enumerate all formula sections from `targetUiData.getDisplay()` in sheet order (excluding non-formula stat/meta sections `basic`, `character`, `bonusStats`, `custom`, `teamBuff`, `moonsign`), omit untriggerable/empty formulas (`node.isEmpty === true`, non-finite, or `Math.abs(node.value) <= 1e-9`) and `%`-unit stat nodes (`resolveNodeUnit === '%'`), and omit sections with zero active formulas.
- **FR-003**: Every `FullDamageFormulaEntry` MUST have `value === display[sectionKey][key].value` (matching a direct `session.evaluate()` of `[sectionKey, key]` under the character's default `hitMode`, `reaction`, and `infusionAura` for that build) and a `DamageRowBreakdown` whose `reconciledPerHit` reconciles with `value`.
- **FR-004**: `FullDamageSectionView` in `apps/web/src/components/OptimizeViews.tsx` MUST render the `"Full Damage"` section inside expanded build details in `BuildComparisonList`, `WeaponComparisonList`, and `TeamOptimizationList`, grouped by talent/source section in sheet order, with each row expandable on click to render `DamageRowBreakdownView`.
- **FR-005**: Solver performance (`GOSolver` / `BackgroundWorker`), rotation totals, and all existing golden tests MUST remain untouched and byte-identical on identical inputs.

### Key Entities

- **`FullDamageSection`**: A talent or reaction group in `RotationResult.fullDamage` (`sectionKey`, `label`, `formulas: FullDamageFormulaEntry[]`).
- **`FullDamageFormulaEntry`**: A single evaluated sheet formula (`key`, `sectionKey`, `path`, `label`, `value`, `element`, `move`, `hitMode`, `reaction`, `breakdown`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Optimizing a preset with a narrow rotation (e.g., burst-focused `official/raiden-national` or skill-focused `official/furina-salon-subdps`) produces a best build whose `fullDamage` contains non-rotation formulas (`normal.*`, `charged.*`, `plunging.*`, `reaction.*`) with real values matching direct `session.evaluate()` calls (`< 1e-6` diff).
- **SC-002**: Untriggerable formulas (`isEmpty === true`) are excluded and become included when their triggering condition/infusion/constellation is activated.
- **SC-003**: All `@gi/engine` and `@gi/web` tests pass with 0 regressions, `pnpm --filter @gi/web build` succeeds, and `npx impeccable detect --json apps/web/src` returns `[]`.

## Assumptions

1. **GO Untriggerable Formula Semantics (`node.isEmpty`)**: In GO (`UIData`, `StatDisplayComponent.tsx`, `FieldDisplay.tsx`, `FormulaModal.tsx`), formulas that the build/team context cannot trigger evaluate with `node.isEmpty === true` (and `0`/non-finite values are hidden unless `showZero` is set for basic stats). We match GO directly by filtering out `node.isEmpty === true` and `Math.abs(node.value) <= 1e-9`, and omitting any section with zero remaining formulas.
2. **Filtering Percentage Stat Buff Nodes from `dmgFormulas`**: Some GO character sheets export `%`-unit buff nodes inside `dmgFormulas` (such as Raiden's `skill.skillEye_` and `passive2.passive2ElecDmgBonus`, or Furina's `passive2.member_dmg_`) alongside flat damage/heal/shield formulas. Matching GO's `TargetSelectorModal.tsx` (`flatOnly: true`), we filter out `%`-unit nodes (`node.info.unit === '%'`, `getUnitStr(node.info.path) === '%'`, or `formulaKey.endsWith('_')`) and non-damage energy generation constants (`energyGen`) so `"Full Damage"` lists only flat damage/heal/shield/reaction formulas.
3. **Evaluation Context for Full Damage Formulas**: In GO (`dataObjForCharacterNew` in `libs/gi/wr/src/api.ts`), sheet formulas in `display[sectionKey][formulaKey]` evaluate under the character's configured `hitMode` (`member.hitMode ?? 'avgHit'`), `reaction` (`member.reaction`), and `infusionAura` (`member.infusionAura`), along with all active team buffs, conditionals, resonance, and enemy settings for that build.
4. **UI Placement & Collapsible UX**: `"Full Damage"` is placed in the expanded Build Details panel right after the Per-Instance Rotation Breakdown (and before Stat Comparison), with all talent/reaction groups visible in sheet order and each formula row expandable on click to `DamageRowBreakdownView`.
