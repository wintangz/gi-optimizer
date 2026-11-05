# Tasks: Single-Character Optimizer (`single-character-optimizer`)

**Input**: Design documents from `/specs/single-character-optimizer/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

## Phase 1: Setup & Next.js Bundling

- [x] T001 Configure `apps/web/next.config.ts`, `tooling/go-paths.mjs`, and `tooling/go-shim.d.ts` so `next build --webpack` statically exports with vendored GO modules

---

## Phase 2: Foundational (`@gi/engine` Core & Catalog)

- [ ] T002 Define `EngineSession`, `BuildSelection`, `RotationResult`, `OptimizerSettings`, `OptimizeResult`, `TargetDescriptor`, and `ConditionalDescriptor` in `packages/engine/src/types.ts`
- [ ] T003 Implement `listTargets(characterKey)` and `listConditionals(characterKey)` in `packages/engine/src/catalog.ts` by inspecting GO sheets and display nodes

---

## Phase 3: User Story 1 & 4 - Preset Evaluation, Golden Fixtures & "Verify in GO" (Priority: P1/P3) 🎯 MVP

**Goal**: Evaluate any preset + build selection using GO's team calculation, export a GO-compatible database for manual verification, and prove ≤0.1% parity against GO golden fixtures.

- [ ] T004 [US1] [US4] Implement `createSession(good)`, `currentBuild`, `evaluate`, and `exportGODatabase` in `packages/engine/src/session.ts`
- [ ] T005 [US1] Create `packages/engine/scripts/capture-golden.ts` and capture golden reference fixtures in `packages/engine/test/golden/*.json` for Furina, Neuvillette, Hu Tao (Vaporize with TC Yelan), Raiden Shogun, Arlecchino, and Mavuika
- [ ] T006 [US1] [US4] Write golden parity and GO export round-trip tests in `packages/engine/test/golden.test.ts` asserting relative error ≤ 0.1% per instance

---

## Phase 4: User Story 2 & 3 - Single-Character Artifact Optimizer & GO-Style Settings (Priority: P1/P2)

**Goal**: Search eligible artifacts for top-N builds maximising rotation damage without ER weighting, honouring ER floor, equipped-on-others, exclusions, level range, main-stat assumption, and set exclusions, running in a Web Worker with progress and cancel.

- [ ] T007 [US2] [US3] Implement artifact filtering, GO `optimize()` node compilation, and branch-and-bound top-N solver in `packages/engine/src/solver.ts` and wire `session.optimize()`
- [ ] T008 [US2] [US3] Write optimizer unit tests in `packages/engine/test/optimizer.test.ts` (exhaustive parity on small pool, ER floor enforcement, ER non-weighting in objective, equipped-on-others exclusion, cancellation)
- [ ] T009 [US2] [US3] Implement Web Worker `apps/web/src/workers/optimizer.worker.ts` and `/optimize` page in `apps/web/src/app/optimize/page.tsx` (preset selector, match report gate, weapon selector, settings panel persisted to IndexedDB, progress bar + Cancel, current vs optimised build & per-instance/stat diff table, "Verify in GO" download button)
