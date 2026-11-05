# Data Model & Contracts: Official Presets (`official-presets`)

Official presets conform to `presetSchema` (`packages/presets/src/schema.ts`, `gi-optimizer/preset@1`) with:
- `source: "official"`
- `id: "official/<slug>"`
- `author: "gi-optimizer"`
- `akasha: undefined`
- `team[0].requirement: {}` (unconstrained weapon/constellation/level/talent so any owner of the target character can run the preset)
- `team[1..3].build.type: "tc"`
