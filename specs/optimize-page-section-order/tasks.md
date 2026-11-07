# Tasks: Optimize Page Section Order (`optimize-page-section-order`)

**Input**: Design documents from `/specs/optimize-page-section-order/`  
**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md)

## Phase 1: Section Reordering on Optimize Page

- [x] T001 Reorder and regroup the sections in `apps/web/src/app/optimize/page.tsx` so they flow top-to-bottom: (1) Team & Buffing (`setup-card` with preset selector, `preset-team-roster`, and `PresetRotationSummary`, followed by `ConditionalTogglePanel`), (2) Weapon Selection (`weapon-selection-card` with `optimize-weapon-mode-bar`, `WeaponComparisonPanel`, target weapon picker, and `preset-match-box`), (3) Artifact Settings (`artifact-settings-card` with artifact pool controls, `optimize-filter-panels-pair`, and `SolverPoolFiltersPanel`, followed by `ConstraintsCard`), and (4) Optimize Action & Results (`results-card`)

## Phase 2: Verification

- [x] T002 Add a regression test in `apps/web/test/official-owned-first-ui.test.tsx` verifying the top-to-bottom section order on `/optimize`, and run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`
