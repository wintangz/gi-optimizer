# Tasks: Bundled Preset Display Names Without Weapon References (`preset-names-drop-weapon`)

- [x] T001 Update `name` in all 5 Akasha preset JSON files under `packages/presets/data/akasha/*.json` to remove weapon and refinement references only
- [x] T002 Update `packages/engine/src/teamData.ts` to recognize `"Furina — Salon Solitaire C2"`
- [x] T003 Add unit test in `packages/presets/test/match.test.ts` verifying weapon-free bundled preset names and preserved `akasha.notes` provenance
- [x] T004 Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`, commit as `"feat: preset-names-drop-weapon"`, and push to `origin main`
