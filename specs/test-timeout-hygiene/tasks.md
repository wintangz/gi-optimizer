# Tasks: Test Timeout Hygiene (`test-timeout-hygiene`)

**Input**: Design documents from `/specs/test-timeout-hygiene/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

## Phase 1: User Story 1 - Per-Test Timeouts on Heavy Full-File Solver Tests (Priority: P1) 🎯 MVP

**Goal**: Configure explicit generous per-test timeouts (`600_000` ms) on the three heavy full-file solver tests in `packages/engine/test/` without modifying global Vitest configuration or weakening any test assertion.

**Independent Test**: Run `pnpm test` across the workspace in parallel and verify all suites pass.

- [x] T001 [P] [US1] Set explicit per-test timeout of `600_000` ms on the two heavy full-file solver tests (`T004` reference parity and `T008` worker termination) in `packages/engine/test/optimizer.test.ts` without changing any assertion
- [x] T002 [P] [US1] Set explicit per-test timeout of `600_000` ms on the full-file multi-worker solver benchmark test in `packages/engine/test/perf-benchmark.test.ts` without changing any assertion
- [x] T003 [US1] Verify full parallel `pnpm test` passes across all workspace packages and `packages/engine/vitest.config.mts` remains unchanged
