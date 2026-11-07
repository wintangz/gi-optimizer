# Tasks: Buffs & Passives Member Switcher Tabs & Worn-Set Filtering (`buff-panel-member-tabs`)

- [x] T001 Add `.gi-buffs-member-tabs` and `.gi-buffs-member-tab` CSS styles in `apps/web/src/app/globals.css`
- [x] T002 Rework `ConditionalTogglePanel` in `apps/web/src/components/ConditionalTogglePanel.tsx` to render a top member tab switcher, display one member at a time, and filter artifact set conditionals to sets with `>= 2` pieces worn
- [x] T003 Update `apps/web/test/ConditionalTogglePanel.test.tsx` to test member tab switching, single-member display, override persistence across switches, and `0pc`/`1pc` vs `2pc`/`4pc` artifact set filtering
- [x] T004 Run `pnpm typecheck`, `pnpm lint`, and `pnpm test`, then commit as `"feat: buff-panel-member-tabs"`
