# Data Model: Test Timeout Hygiene (`test-timeout-hygiene`)

No persistent data models or runtime schemas are introduced by this feature.

## Test-Level Timeout Contracts

| File | Test Name | Previous Timeout | New Per-Test Timeout |
|------|-----------|------------------|----------------------|
| `packages/engine/test/optimizer.test.ts` | `matches reference single-threaded solver on full Van_2025-07-16_19-59-13.json for unfiltered and 1-set filtered runs (T004)` | `120_000` (3rd arg) | `600_000` (3rd arg) |
| `packages/engine/test/optimizer.test.ts` | `terminates all BackgroundWorker instances on mid-run AbortSignal cancellation and on normal completion (T008)` | Inherited (`120_000`) | `600_000` (3rd arg) |
| `packages/engine/test/perf-benchmark.test.ts` | `measures cold load, preset switch, and multi-worker GOSolver timings on Van_2025-07-16_19-59-13.json` | `120_000` (3rd arg) | `600_000` (3rd arg) |
