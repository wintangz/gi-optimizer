# Implementation Plan: Test Timeout Hygiene (`test-timeout-hygiene`)

**Branch**: `test-timeout-hygiene` | **Date**: 2026-11-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/test-timeout-hygiene/spec.md`

## Summary

Give the three heavy full-file (`Van_2025-07-16_19-59-13.json`, 1,157 artifacts) solver tests in `packages/engine/test/optimizer.test.ts` (T004 and T008) and `packages/engine/test/perf-benchmark.test.ts` explicit test-level timeouts of `600_000` ms (10 minutes) without bumping the global `testTimeout: 120_000` in `packages/engine/vitest.config.mts` and without weakening any test assertion.

## Technical Context

**Language/Version**: TypeScript 5 (strict)
**Primary Dependencies**: Vitest 3 (`@gi/engine`)
**Storage**: N/A
**Testing**: `pnpm test` (`vitest run` across all workspace packages in parallel)
**Target Platform**: Node.js >= 22 test runner on 4-core+ machines
**Project Type**: Monorepo pnpm workspace (`packages/engine`)
**Performance Goals**: Zero test timeouts during full parallel `pnpm test` execution on a 4-core machine
**Constraints**: Test-level timeout option only (no global config bump); zero weakened assertions; no engine, worker, data, or submodule changes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Frontend-Only Client**: PASS — test-only change in `packages/engine/test/`.
- **II. GO Formula Fidelity**: PASS — golden fixtures and solver assertions remain 100% unchanged.
- **III. Import Is GOOD Only**: PASS — N/A.
- **IV. Presets Are Plain JSON Setup Bundles**: PASS — N/A.
- **V. Single-Character, Akasha-Style Objective**: PASS — N/A.

## Project Structure

### Documentation (this feature)

```text
specs/test-timeout-hygiene/
├── spec.md              # Feature specification
├── plan.md              # This implementation plan
├── research.md          # Phase 0 analysis of heavy solver tests
├── data-model.md        # Phase 1 test timeout configuration model
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 implementation tasks
```

### Source Code (repository root)

```text
packages/engine/
└── test/
    ├── optimizer.test.ts      # Per-test 600_000ms timeout on T004 and T008 full-file solver tests
    └── perf-benchmark.test.ts # Per-test 600_000ms timeout on full-file benchmark solver test
```

**Structure Decision**: Modify only the test-level timeout arguments on the three full-file solver `it(...)` blocks in `packages/engine/test/optimizer.test.ts` and `packages/engine/test/perf-benchmark.test.ts`.

## Complexity Tracking

No constitution violations. Zero new dependencies.
