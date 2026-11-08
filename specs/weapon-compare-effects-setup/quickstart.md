# Quickstart: Per-Candidate Effect Setup in Weapon Comparison (`weapon-compare-effects-setup`)

## Verification Commands

```powershell
# 1. Run preset settings & schema tests
pnpm --filter @gi/presets test

# 2. Run engine weapon-compare & golden tests
pnpm --filter @gi/engine test -- test/weapon-compare.test.ts test/golden.test.ts

# 3. Run web component tests
pnpm --filter @gi/web test

# 4. Full workspace typecheck, lint, test, and static export build
pnpm typecheck; pnpm lint; pnpm test; pnpm build
```

## Key Acceptance Check

1. Configure 3 weapon candidates in `compareWeapons` (e.g., Candidate 1 `FavoniusSword`, Candidate 2 `SplendorOfTranquilWaters`, Candidate 3 `FleuveCendreFerryman`).
2. Run baseline `compareWeapons` and record totals for Candidates 1, 2, and 3.
3. On Candidate 2 (`SplendorOfTranquilWaters`), change its weapon passive stacks (`SplendorOfTranquilWaters.selfHpChange`) AND a target artifact-set conditional (`GoldenTroupe.set4`), then re-run `compareWeapons`.
4. Verify:
   - Candidate 1's total is bit-identical (`===`) to baseline.
   - Candidate 3's total is bit-identical (`===`) to baseline.
   - Candidate 2's total reflects both conditional changes (and matches a standalone `session.optimize` with those exact overrides).
