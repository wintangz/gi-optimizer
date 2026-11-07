# Implementation Plan: Buffs & Passives Column Grid Layout (`buff-panel-columns`)

1. Update `apps/web/src/components/ConditionalTogglePanel.tsx`:
   - Add `gi-buffs-grid` class and `data-testid="buff-group-grid-<category>-<memberKey>"` to the entries container in each of the 4 groups (`weapon`, `artifact`, `character`, `constellation`).
   - Add `gi-buff-cell` class to each conditional entry in `renderConditionalRow`.
2. Update `apps/web/src/app/globals.css`:
   - Change `.gi-buffs-rows` / `.gi-buffs-grid` to `display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.45rem; align-items: stretch;`.
   - Ensure `.gi-buff-row` / `.gi-buff-cell` has `height: 100%; min-width: 0; box-sizing: border-box;` and `.gi-buff-row-label` wraps inside the cell (`overflow-wrap: anywhere; word-break: break-word; min-width: 0;`).
   - Add `@media (max-width: 1024px)` (`repeat(2, minmax(0, 1fr))`) and `@media (max-width: 640px)` (`1fr`) rules for `.gi-buffs-rows, .gi-buffs-grid`.
3. Add regression test in `apps/web/test/ConditionalTogglePanel.test.tsx` verifying the column grid containers, compact cell classes, and responsive CSS rules.
