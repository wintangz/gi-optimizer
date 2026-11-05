# Data Model: Engine & Web Performance Optimization (`performance`)

## 1. Hydrated Preset Team Cache (`packages/engine/src/session.ts`)

Within a single `EngineSession` created via `createSession(good)`:

- **`baseDb: ArtCharDatabase`**:
  - Instantiated once per `createSession(good)` with `new ArtCharDatabase(1, new SandboxStorage())`.
  - Populated once via `baseDb.importGOOD(goodObj, false, false, false)`.
  - Equipped locations on `baseDb.arts` and `baseDb.weapons` are never mutated after `importGOOD`.
- **`HydratedPresetTeam`**:
  - `teamId: string` — ID of the `Team` record inside `db.teams`.
  - `targetTeamCharId: string` — ID of the target character's `TeamCharacter` record inside `db.teamChars`.
- **`hydratePresetTeam(db: ArtCharDatabase, preset: Preset): HydratedPresetTeam`**:
  - Computes a deterministic fingerprint string `presetFingerprint(preset)` (or clears only `db.teams.clear()`, `db.teamChars.clear()`, `db.buildTcs.clear()` when the fingerprint changes from the last hydrated preset on `db`).
  - Populates up to 4 `db.teamChars` entries (slot 0 = target with `buildCustomMultiTargetsForPreset(preset)`), `db.buildTcs` for any `'tc'` teammates, and one `db.teams` entry with `enemyOverride` and `teamConditional`.
  - Never calls `db.importGOOD(...)`.

## 2. Catalog Module Caches (`packages/engine/src/catalog.ts`)

- **`targetCache: Map<CharacterKey, TargetDescriptor[]>`**:
  - Maps normalized `CharacterKey` (e.g., `'Traveler'` → `'TravelerAnemo'`) to its `TargetDescriptor[]` list.
- **`conditionalCache: Map<CharacterKey, ConditionalDescriptor[]>`**:
  - Maps normalized `CharacterKey` to its complete `ConditionalDescriptor[]` list (character sheet + global artifact sets + matching `WeaponTypeKey` weapons + resonance + reaction conditionals).
- **`GlobalCatalogCache`** (computed lazily once per process):
  - `artifactConditionals: ConditionalDescriptor[]` — extracted once from `allArtifactSetKeys`.
  - `weaponConditionalsByType: Map<WeaponTypeKey, ConditionalDescriptor[]>` — extracted once from `allWeaponKeys`, bucketed by `getWeaponStat(wKey).weaponType` (`allStats.weapon.data[wKey].weaponType`).
  - `resonanceAndReactionConditionals: ConditionalDescriptor[]` — extracted once from `resonanceSheets` and `reactionConditionals`.

## 3. Worker Message Protocol (`apps/web/src/workers/optimizer.worker.ts` & `apps/web/src/lib/engine/workerClient.ts`)

### Requests (`WorkerRequest`)

Every request (except `cancel`) carries a unique `requestId: string` and `datasetKey: string` (e.g. `record.importedAt`) so the worker knows whether its cached `EngineSession` matches the active GOOD dataset:

```ts
export type WorkerRequest =
  | {
      type: 'init'
      requestId: string
      datasetKey: string
      good: IGOOD
    }
  | {
      type: 'evaluate'
      requestId: string
      datasetKey: string
      good?: IGOOD
      preset: Preset
      selection?: BuildSelection
    }
  | {
      type: 'optimize'
      requestId: string
      datasetKey: string
      good?: IGOOD
      preset: Preset
      settings: OptimizerSettings
      weaponId?: string
    }
  | {
      type: 'catalog'
      requestId: string
      characterKeys: string[]
    }
  | {
      type: 'exportGO'
      requestId: string
      datasetKey: string
      good?: IGOOD
      preset: Preset
      selection?: BuildSelection
    }
  | {
      type: 'cancel'
      requestId?: string
    }
```

### Responses (`WorkerResponse`)

```ts
export type WorkerResponse =
  | {
      type: 'initResult'
      requestId: string
      datasetKey: string
    }
  | {
      type: 'evaluateResult'
      requestId: string
      currentBuild: BuildSelection
      result: RotationResult
    }
  | {
      type: 'progress'
      requestId: string
      progress: OptimizeProgress
    }
  | {
      type: 'result'
      requestId: string
      result: OptimizeResult
    }
  | {
      type: 'catalogResult'
      requestId: string
      targetsByChar: Record<string, TargetDescriptor[]>
      conditionalsByChar: Record<string, ConditionalDescriptor[]>
    }
  | {
      type: 'exportGOResult'
      requestId: string
      exported: object
    }
  | {
      type: 'error'
      requestId?: string
      message: string
    }
```

### Worker State Transitions

1. **Cold State (`cachedSession === null`)**:
   - On `init`, `evaluate`, `optimize`, or `exportGO` with `good` and `datasetKey`, worker calls `createSession(good)` once and stores `{ datasetKey, session }`.
2. **Warm State (`cachedSession.datasetKey === msg.datasetKey`)**:
   - Subsequent `evaluate`, `optimize`, and `exportGO` requests with the same `datasetKey` reuse `cachedSession.session` directly without re-importing `good`.
3. **Dataset Replacement (`cachedSession.datasetKey !== msg.datasetKey`)**:
   - When the user imports a new GOOD file (`importedAt` changes), `workerClient` passes the new `datasetKey` and `good`; the worker replaces `cachedSession` with a newly hydrated `createSession(good)`.
