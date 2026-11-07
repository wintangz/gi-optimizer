# Research: Test Timeout Hygiene (`test-timeout-hygiene`)

## Decision 1: Identifying the Three Heavy Full-File Solver Tests

- **Decision**: Apply explicit `600_000` ms (10-minute) per-test timeouts to:
  1. `packages/engine/test/optimizer.test.ts`: `'matches reference single-threaded solver on full Van_2025-07-16_19-59-13.json for unfiltered and 1-set filtered runs (T004)'` (runs 3 full-account solver optimizations: single-worker 1-set, 4-worker 1-set, and multi-worker unfiltered across all 1,157 artifacts).
  2. `packages/engine/test/optimizer.test.ts`: `'terminates all BackgroundWorker instances on mid-run AbortSignal cancellation and on normal completion (T008)'` (hydrates `fullGood` with 1,157 artifacts, runs upfront pruning/counting and spawns 4 workers on unfiltered `fullGood` before aborting, then runs a 2-worker completion check).
  3. `packages/engine/test/perf-benchmark.test.ts`: `'measures cold load, preset switch, and multi-worker GOSolver timings on Van_2025-07-16_19-59-13.json'` (runs full-account 1-set GoldenTroupe optimization and full-account unfiltered optimization across all 1,157 artifacts).
- **Rationale**: All other solver tests in `packages/engine/test/optimizer.test.ts` and `packages/engine/test/akasha-isolation.test.ts` operate on small reduced artifact pools (`smallGood` with 3 artifacts/slot or `baseArtifacts` with 15 artifacts total) and complete in a few seconds well within the 120s default cap. The three full-file tests operate on all 1,157 artifacts of `Van_2025-07-16_19-59-13.json` and contend for CPU threads when Vitest runs test files in parallel.
- **Alternatives considered**: Increasing `testTimeout` globally in `packages/engine/vitest.config.mts` (rejected by user specification: must be a test-level option, not a global bump).
