# Research: Full Damage Display (`full-damage-display`)

**Feature**: `full-damage-display`  
**Date**: 2026-11-09

## 1. How GO Enumerates & Filters Character Sheet Damage Formulas

### Decision
Read `display = targetUiData.getDisplay()` in `session.evaluate()` and extract `fullDamage: FullDamageSection[]` by iterating `Object.entries(display)` in sheet order, excluding non-formula sections (`basic`, `character`, `bonusStats`, `custom`, `teamBuff`, `moonsign`), filtering out untriggerable/empty nodes (`node.isEmpty === true` or `Math.abs(node.value) <= 1e-9` or non-finite) and `%`-unit stat buff nodes (`node.info?.unit === '%'`, `getUnitStr(node.info?.path) === '%'`, or `formulaKey.endsWith('_')`), and omitting sections with zero remaining entries.

### Rationale
- In `vendor/genshin-optimizer/libs/gi/sheets/src/Characters/dataUtil.tsx` (`dataObjForCharacterSheet`), `display` is constructed with the character sheet's `dmgFormulas` keys first in exact sheet definition order (`normal`, `charged`, `plunging`, `skill`, `burst`, `sprint`, `passive*`, `constellation1`..`constellation6`), followed by `basic`, `reaction` (`reactions[element]`), `nicole` (`projections`), and `moonsign`, and then merged with `weapon:${weaponKey}` and `artifact:${setKey}` in `getCharDataBundle`.
- In `vendor/genshin-optimizer/libs/gi/uidata/src/uiData.ts` (`_match`, `_threshold`), any formula gated by an unmet condition (such as non-native reactions in `display.reaction` requiring an elemental infusion, locked constellation/ascension formulas, inactive conditional hits, or unequipped weapon/artifact formulas) returns `makeEmpty(result.value)` (`isEmpty: true`).
- In `StatDisplayComponent.tsx`, `FieldDisplay.tsx`, `FormulaModal.tsx`, and `TargetSelectorModal.tsx` (`flatOnly: true`), GO omits any node with `node.isEmpty === true`, omits zero-valued nodes (`!calcValue`), omits `%`-unit stat nodes when listing flat damage targets, and omits sections where all nodes are empty.

## 2. Walking Formula AST to Find Per-Formula `hitUiData`

### Decision
Implement `findHitUiDataForFormula(uiData: UIData, node: NumNode | StrNode | undefined)` in `packages/engine/src/breakdown.ts` that walks the formula's `NumNode` AST along the active evaluation branch (`data`, `threshold`, `match`, `lookup`, `read`, `add`/`mul`/`min`/`max`), transitioning `uiData = (node.reset ? uiData.origin : uiData).child(node.data)` at each `DataNode` until it finds the child `UIData` where `topData.hit?.base` is defined.

### Rationale
- Unlike `display.custom.${idx + 1}` (which wraps each rotation row in a unique outer `data(...)` node), formulas in `display[sectionKey][formulaKey]` are evaluated directly on `targetUiData`, so `targetUiData.children` contains children for all evaluated formulas.
- Walking `formulaNode` directly along active `threshold`/`match`/`lookup`/`data` branches locates the exact `hitUiData` for that specific formula node, even for multi-hit (`prod(2, dmgNode(...))`), ascension/constellation-gated (`greaterEq(input.asc, 4, dmgNode(...))`), or nested `data(...)` formulas (`splitScaleDmgNode`, `plungingDmgNodes`).
- For non-`hit.base` formulas (such as `display.reaction` transformative/lunar/stellar reactions, direct `lunarDmgNode`/`stellarDmgNode`, or `healNode`/`shieldNode`), `extractFormulaBreakdown` builds a 6-factor `DamageRowBreakdown` using the active element's `resMulti` (`input.enemy[${ele}_resMulti_]`) and effective `critMulti` so that `reconciledPerHit === value` and `DamageRowBreakdownView` renders all 6 factors cleanly.

## 3. Performance & Solver Isolation

### Decision
Compute `fullDamage` inside `session.evaluate()` from the already-computed `display = targetUiData.getDisplay()`.

### Rationale
- `GOSolver` / `BackgroundWorker` never calls `session.evaluate()`.
- `session.evaluate()` is called only for displayed builds (1 current build + top N result builds). Because `targetUiData.getDisplay()` is already computed on line 1625 of `packages/engine/src/session.ts`, iterating the non-empty entries takes `< 1 ms` per displayed build and has zero impact on solver throughput.
