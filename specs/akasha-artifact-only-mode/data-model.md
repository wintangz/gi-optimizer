# Data Model: Akasha Artifact-Only Mode (`akasha-artifact-only-mode`)

## 1. Preset Schema Contracts (`packages/presets/src/schema.ts`)

### `FixedBuild` (`fixedBuildSchema`)

```ts
export const fixedCharacterSchema = z.object({
  level: z.number().int().min(1).max(100),
  ascension: z.number().int().min(0).max(6),
  constellation: z.number().int().min(0).max(6),
  talent: z.object({ auto: talentLevel, skill: talentLevel, burst: talentLevel }),
})

export const fixedWeaponSchema = z.object({
  key: weaponKey,
  level: z.number().int().min(1).max(90),
  ascension: z.number().int().min(0).max(6),
  refinement: z.number().int().min(1).max(5),
})

export const fixedBuildSchema = z.object({
  type: z.literal('fixed'),
  character: fixedCharacterSchema,
  weapon: fixedWeaponSchema,
})
```

### `teamMemberSchema.build` Discriminated Union

```ts
build: z.discriminatedUnion('type', [
  z.object({ type: z.literal('owned') }),
  fixedBuildSchema,
  z.object({ type: z.literal('tc'), tc: tcBuildSchema }),
])
```

### Validation Rules (`presetSchema.superRefine` & `packages/presets/src/validate.ts`)

- **Akasha target rule (`source === 'akasha'`)**:
  - `team[0].build.type` MUST equal `'fixed'`.
  - `team[0].build.weapon.key` weapon type MUST match `team[0].key` character weapon type.
  - `team[1..3]` MUST each have `build.type === 'tc'`.
- **Official & User target rule (`source === 'official' | 'user'`)**:
  - `team[0].build.type` MUST equal `'owned'`.
  - `team[1..3]` MUST NOT use `build.type === 'fixed'`.

---

## 2. Bundled Akasha Preset Target Builds (`packages/presets/data/akasha/*.json`)

| Preset ID | Target (`team[0].key`) | `character` (`level`, `ascension`, `constellation`, `talent`) | Default `weapon` (`key`, `level`, `ascension`, `refinement`) |
| :--- | :--- | :--- | :--- |
| `akasha/furina-salon-pjc-c0` | `Furina` | Lv. 90, Asc 6, C0, `10/10/10` | `PrimordialJadeCutter`, Lv. 90, Asc 6, R1 |
| `akasha/furina-splendor-c2` | `Furina` | Lv. 90, Asc 6, C2, `10/10/10` | `SplendorOfTranquilWaters`, Lv. 90, Asc 6, R1 |
| `akasha/neuvillette-hypercarry-protoamber-c0` | `Neuvillette` | Lv. 90, Asc 6, C0, `10/10/10` | `PrototypeAmber`, Lv. 90, Asc 6, R5 |
| `akasha/hutao-double-hydro-homa-c1` | `HuTao` | Lv. 90, Asc 6, C1, `10/10/10` | `StaffOfHoma`, Lv. 90, Asc 6, R1 |
| `akasha/raiden-hypercarry-scarlet-c0` | `RaidenShogun` | Lv. 90, Asc 6, C0, `10/10/10` | `StaffOfTheScarletSands`, Lv. 90, Asc 6, R1 |

---

## 3. Weapon Catalog & Account Matching Contracts (`packages/presets/src/metadata.ts`, `packages/presets/src/match.ts`)

- **`listWeaponsForType(weaponType: IdentifierWeaponType): WeaponMeta[]`**:
  - Returns all weapons in `ALL_WEAPON_KEYS` (excluding `QuantumCatalyst`) matching `weaponType`, ordered by `rarity` descending (`5 → 1`) then `displayName` ascending.
- **`matchAccount(preset: Preset, account: AccountDataLike, opts?: { selectedWeaponId?: string }): MatchReport`**:
  - When `preset.source === 'akasha'`, returns `{ presetId: preset.id, canRun: true, parts: [] }`.
  - When `preset.source === 'official' | 'user'`, performs full part-by-part matching on `build.type === 'owned'` members.

---

## 4. Engine & Worker Contracts (`packages/engine/src/types.ts`, `apps/web/src/workers/optimizer.worker.ts`)

```ts
export interface SimulatedWeaponSpec {
  key: string
  level?: number       // default 90 (clamped to rarity max, e.g. 70 for 1★/2★)
  ascension?: number   // default 6 (clamped to rarity max, e.g. 4 for 1★/2★)
  refinement: number   // 1..5
}

export interface BuildSelection {
  weaponId?: string
  weaponOverride?: SimulatedWeaponSpec
  artifactIds: Partial<Record<ArtifactSlot, string>>
}
```

- **`EngineSession.currentBuild(preset)`**:
  - For `team[0].build.type === 'fixed'`: returns `{ weaponOverride: { ...preset.team[0].build.weapon }, artifactIds }` where `artifactIds` contains only the artifacts equipped on `preset.target` in `baseDb` (or `{}` if the character is unowned or unequipped). Never returns `weaponId`.
  - For `team[0].build.type === 'owned'`: returns `{ weaponId: char.equippedWeapon || undefined, artifactIds }`.
- **`EngineSession.evaluate(preset, selection)`**:
  - For `team[0].build.type === 'fixed'`: passes `overrideChar = preset.team[0].build.character` and `overrideWeapon = toSimulatedCachedWeapon(targetKey, selection?.weaponOverride ?? preset.team[0].build.weapon)` to GO's `getTeamData`.
- **`EngineSession.optimize(preset, settings, opts)`**:
  - Accepts `opts?.weaponOverride?: SimulatedWeaponSpec`.
  - For `team[0].build.type === 'fixed'`: passes `overrideChar = preset.team[0].build.character` and `overrideWeapon = toSimulatedCachedWeapon(targetKey, opts?.weaponOverride ?? preset.team[0].build.weapon)` to `runSolver` / `getTeamData`, and tags each returned build in `OptimizeResult.builds` with `weaponOverride`.
