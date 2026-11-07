# Tasks: Akasha Default Weapon (`akasha-default-weapon`)

- [x] T001 [US1] [US3] Update `currentBuild(preset)` in `packages/engine/src/session.ts` to return the target character's equipped weapon from `baseDb` (at simulated max level/ascension) when present on a `fixed` target, falling back to `targetMember.build.weapon`
- [x] T002 [US2] Update `akashaWeaponSpec` in `apps/web/src/app/optimize/page.tsx` to seed the default Akasha weapon from the target character's equipped weapon in `record?.good` when present
- [x] T003 [US1] [US3] Rebuild `@gi/engine` and add regression tests in `packages/engine/test/akasha-isolation.test.ts`
