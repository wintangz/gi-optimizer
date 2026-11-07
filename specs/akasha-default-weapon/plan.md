# Implementation Plan: Akasha Default Weapon (`akasha-default-weapon`)

1. Update `currentBuild(preset)` in `packages/engine/src/session.ts` to seed `weaponOverride` from `baseDb.weapons.get(char.equippedWeapon)` when `targetMember?.build.type === 'fixed'` and `char?.equippedWeapon` exists, falling back to `targetMember.build.weapon`.
2. Update `akashaWeaponSpec` in `apps/web/src/app/optimize/page.tsx` to seed the initial weapon selection from the target character's equipped weapon in `record?.good` when present, falling back to `activePreset.team[0].build.weapon`.
3. Rebuild `@gi/engine` (`node packages/engine/scripts/build-engine.mjs`).
4. Add unit tests in `packages/engine/test/akasha-isolation.test.ts` covering equipped non-case weapon default, absent target character fallback to case weapon, and explicit `weaponOverride` precedence.
