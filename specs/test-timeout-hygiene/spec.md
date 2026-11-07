# Feature Specification: Test Timeout Hygiene for Heavy Full-File Solver Tests

**Feature**: `test-timeout-hygiene` (slug; the git commit is the version)

**Created**: 2026-11-07

**Status**: Draft

**Input**: User description: "The suite's default 120s per-test cap makes three heavy full-file solver tests time out when the whole suite runs in parallel on a small machine; each passes alone with an adequate timeout. Give the heavy solver tests explicit generous per-test timeouts (test-level option, not a global bump), so a full parallel `pnpm test` is green on a 4-core machine without weakening any assertion."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reliable Full-Suite Parallel Test Execution on Small Machines (Priority: P1)

When a developer or CI runner executes the full workspace test suite (`pnpm test`) in parallel on a 4-core machine, the three heavy full-file solver tests in `@gi/engine`—which run multi-worker and single-worker optimizations across the full 1,157-artifact `Van_2025-07-16_19-59-13.json` account while competing for CPU cores with concurrent test files—complete reliably without hitting the default 120-second per-test timeout cap.

**Why this priority**: False-negative test timeouts during full parallel suite runs block verification and mask real regressions.

**Independent Test**: Run `pnpm test` across the entire workspace on a constrained machine and verify that all test suites (`@gi/good`, `@gi/presets`, `@gi/engine`, `@gi/web`) pass with zero timeout failures and zero weakened assertions.

**Acceptance Scenarios**:

1. **Given** the three heavy full-file solver tests in `packages/engine/test/optimizer.test.ts` (`T004` reference parity and `T008` worker termination on `fullGood`) and `packages/engine/test/perf-benchmark.test.ts` (full-account 1-set and unfiltered solver benchmark), **When** inspected, **Then** each test specifies an explicit generous test-level timeout (`600_000` ms) rather than relying on or bumping the global `testTimeout: 120_000` setting in `packages/engine/vitest.config.mts`.
2. **Given** the global Vitest configuration in `packages/engine/vitest.config.mts`, **When** inspected, **Then** the suite default `testTimeout: 120_000` remains unchanged so non-heavy tests remain bounded by the standard cap.
3. **Given** all test assertions across `packages/engine/test/optimizer.test.ts` and `packages/engine/test/perf-benchmark.test.ts`, **When** compared against the baseline commit, **Then** zero assertions, tolerances, or workload sizes are weakened or removed.

### Edge Cases

- **Contention under simultaneous worker-thread spawning**: When `optimizer.test.ts` and `perf-benchmark.test.ts` run simultaneously under Vitest's file parallelism, each spawns multiple `node:worker_threads` `BackgroundWorker` instances on a 4-core CPU; a 600,000 ms (10-minute) per-test timeout gives ample headroom for full-account unfiltered and 1-set optimizations to finish sequentially or concurrently under heavy CPU contention.
- **Fast failure for fast unit tests**: Because the global `testTimeout` in `packages/engine/vitest.config.mts` (120s) and other packages (5s) is not bumped, any accidental hang in normal unit tests still fails promptly.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The full-account reference parity solver test in `packages/engine/test/optimizer.test.ts` (`'matches reference single-threaded solver on full Van_2025-07-16_19-59-13.json for unfiltered and 1-set filtered runs (T004)'`) MUST have an explicit test-level timeout of `600_000` ms.
- **FR-002**: The full-account worker-termination solver test in `packages/engine/test/optimizer.test.ts` (`'terminates all BackgroundWorker instances on mid-run AbortSignal cancellation and on normal completion (T008)'`) MUST have an explicit test-level timeout of `600_000` ms.
- **FR-003**: The full-account multi-worker solver benchmark test in `packages/engine/test/perf-benchmark.test.ts` (`'measures cold load, preset switch, and multi-worker GOSolver timings on Van_2025-07-16_19-59-13.json'`) MUST have an explicit test-level timeout of `600_000` ms.
- **FR-004**: The default `testTimeout: 120_000` in `packages/engine/vitest.config.mts` MUST NOT be increased globally.
- **FR-005**: No test assertion, numerical tolerance, or artifact pool size in any test file may be weakened or removed.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Full parallel `pnpm test` passes 100% of test suites and tests across the monorepo without timing out.
- **SC-002**: All 11 golden fixture files under `packages/engine/test/golden/` remain byte-for-byte identical.
- **SC-003**: `packages/engine/vitest.config.mts` retains `testTimeout: 120_000`, and only the three heavy full-file solver tests carry the `600_000` ms test-level timeout option.

## Assumptions

- **TTH-A1 (Per-Test Timeout Value)**: Setting the test-level timeout to `600_000` ms (10 minutes) on the three heavy full-file solver tests provides generous headroom on a 4-core machine when all packages and test files run in parallel, while keeping the suite's default 120s cap intact for all other tests.
