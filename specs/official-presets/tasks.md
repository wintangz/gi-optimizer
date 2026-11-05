# Tasks: Official Presets (`official-presets`)

**Input**: Design documents from `/specs/official-presets/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

## Phase 1: Bundled Official Presets JSON

- [x] T001 [P] [US1] Author `packages/presets/data/official/neuvillette-hypercarry.json` and `packages/presets/data/official/furina-salon-subdps.json`
- [x] T002 [P] [US1] Author `packages/presets/data/official/hutao-double-hydro-vape.json` and `packages/presets/data/official/raiden-hypercarry.json`
- [x] T003 [P] [US1] Author `packages/presets/data/official/arlecchino-vaporize.json` and `packages/presets/data/official/mavuika-melt-hypercarry.json`

---

## Phase 2: Validation & Golden Parity Tests

- [x] T004 [US2] Write `packages/presets/test/official.test.ts` verifying all 6 official presets validate against `presetSchema`, have `source === "official"`, unconstrained target requirements, and `tc` teammates
- [x] T005 [US1] [US2] Verify all 6 official presets resolve every rotation path and match GO golden fixtures within 0.1% relative error in `packages/engine/test/golden.test.ts`
