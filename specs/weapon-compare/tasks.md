# Tasks: Weapon Comparison Mode (`weapon-compare`)

- [x] T001 [US1] [US2] Add `WeaponCompareCandidate`, `WeaponCompareRowResult`, `WeaponCompareProgress`, `WeaponCompareResult`, `resolveDefaultWeaponCompareCandidate`, `rankWeaponCompareRows`, and `compareWeapons` to `packages/engine` and rebuild engine bundles
- [x] T002 [US1] [US2] Add engine unit tests in `packages/engine/test/weapon-compare.test.ts` covering shared stat constraints satisfaction, ER-floor ranking reversal, unmet constraints row, owned/unowned default specs, and mid-run cancellation
- [x] T003 [US1] [US3] [US4] Extend `WeaponTilePicker` for multi-select (`selectedIds`), implement `WeaponComparisonPanel` and `WeaponComparisonList` in `apps/web/src/components/OptimizeViews.tsx`, and wire run-local Weapon Comparison mode into `apps/web/src/app/optimize/page.tsx`
- [x] T004 [US1] [US3] Add UI unit tests in `apps/web/test/OptimizeViews.test.tsx` for `WeaponComparisonPanel` and `WeaponComparisonList`
- [x] T005 Verify full test suite (`pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`), measure static export size, commit as `feat: weapon-compare`, and push
