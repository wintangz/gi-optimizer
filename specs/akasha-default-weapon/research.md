# Research & Data Model: Akasha Default Weapon (`akasha-default-weapon`)

## Decision 1: Reading Equipped Weapon in `session.currentBuild(preset)`
- **Decision**: In `packages/engine/src/session.ts`, inside `currentBuild(preset)` when `targetMember?.build.type === 'fixed'`, look up `const equippedId = char?.equippedWeapon` and `const equippedWeapon = equippedId ? baseDb.weapons.get(equippedId) : undefined`. If `equippedWeapon` exists, determine `rarity = (getWeaponStat(equippedWeapon.key as never) as { rarity?: number } | undefined)?.rarity ?? 5` and `isLowRarity = rarity <= 2`, returning:
  ```ts
  weaponOverride: {
    key: equippedWeapon.key,
    level: isLowRarity ? 70 : 90,
    ascension: isLowRarity ? 4 : 6,
    refinement: isLowRarity ? 1 : equippedWeapon.refinement,
  }
  ```
  Otherwise return `targetMember.build.weapon`.
- **Rationale**: `baseDb` has already imported and validated the GOOD payload once at `createSession(good)` time, so `char.equippedWeapon` is guaranteed to reference a valid weapon of the character's weapon type in `baseDb.weapons`.

## Decision 2: Seeding `akashaWeaponSpec` on `/optimize`
- **Decision**: In `apps/web/src/app/optimize/page.tsx`, when no explicit user choice exists in `akashaWeaponByPreset[activePreset.id]`, check if `record?.good` contains the target character (`record.good.characters.some((c) => c.key === activePreset.target)`) and an equipped weapon of matching weapon type (`record.good.weapons.find((w) => w.location === activePreset.target && getWeaponMeta(w.key).weaponType === getCharacterMeta(activePreset.target).weaponType)`). When found, return `{ key: w.key, level: isLowRarity ? 70 : 90, ascension: isLowRarity ? 4 : 6, refinement: isLowRarity ? 1 : w.refinement }`; otherwise return `activePreset.team[0].build.weapon`.
