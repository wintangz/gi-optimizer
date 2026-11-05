# Research: GOOD Import (`good-import`)

## Decisions

### 1. Validation & Normalization Alignment with Genshin Optimizer
- **Decision**: Validate GOOD input in two layers in `@gi/good`:
  1. Structural + diagnostic pass (`parseGood`) that checks JSON syntax (with line/column calculation), top-level format (`format === "GOOD"`), detects common wrong formats (Enka.Network UID showcase JSON containing `avatarInfoList` / `playerInfo`, array root, empty input), checks every character/weapon/artifact field against GO's canonical key sets (`allCharacterKeys`, `allWeaponKeys`, `allArtifactSetKeys`, `allArtifactSlotKeys`, `allMainStatKeys`, `allSubstatKeys` from `@genshin-optimizer/gi/consts`), computes Levenshtein/near-match suggestions (`did you mean 'critRate_'?`), and records every issue with `{ severity: 'fatal' | 'error' | 'warning' | 'info', path, message, suggestion? }`.
  2. Normalization pass that mirrors GO's `ArtCharDatabase.importGOOD` (`vendor/genshin-optimizer/libs/gi/db/src/Database/ArtCharDatabase.ts`) so that every accepted item has a stable unique `id` (`artifact_0`, `weapon_0`, or preserved unique ID) and normalized values identical to what GO's database stores.
- **Rationale**: Constitution III requires plain-language error reporting without silent drops, and FR-006 requires 1:1 agreement with GO's downstream import.
- **Alternatives considered**: Calling `ArtCharDatabase.importGOOD` alone (rejected because GO silently drops/clamps invalid entries without per-path messages or near-match suggestions).

### 2. Browser Local Storage (IndexedDB)
- **Decision**: Use the `idb` library (lightweight Promise wrapper around IndexedDB) in `apps/web/src/lib/storage/db.ts` with database name `gi-optimizer` (version 1) and three object stores per `docs/architecture.md`:
  - `good` (key `'current'` → `StoredGoodRecord`)
  - `presets` (key `preset.id` → `Preset`)
  - `settings` (key `'optimizer'` → `OptimizerSettings`)
  Also provide an in-memory fallback map when `indexedDB` is unavailable (e.g. Node unit tests or restricted contexts) and `fake-indexeddb` in unit tests.
- **Rationale**: Mandated by Constitution I and `docs/architecture.md`.

### 3. Responsive Tables for 1,000+ Artifacts
- **Decision**: Client-side memoized filtering + pagination/windowed slice (e.g. 100 rows per page with instant filter updates and page controls) so filtering 1,157+ artifacts takes <10 ms and DOM rendering stays under 50 ms.
- **Rationale**: Satisfies SC-006 (<200 ms filter updates) with zero extra UI library bloat.

