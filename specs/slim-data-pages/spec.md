# Feature Specification: Slim Data Pages (`/import` & `/presets` Bundle Slimming)

**Feature**: `slim-data-pages` (slug; the git commit is the version)

**Created**: 2026-11-05

**Status**: Draft

**Input**: User description: "Deduplicate and compact `statMeta.gen.ts` & eliminate runtime `@genshin-optimizer/gi/consts` imports; replace runtime `zod` with a lightweight zero-dependency schema validator in `packages/presets/src/schema.ts`; slim route imports on `/import` and `/presets` so they only load the modules they actually use on initial render; ensure `/import` and `/presets` First Load JS are within ~60 kB of the `/` route's First Load JS."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Single Canonical & Compact Metadata Without Runtime `@genshin-optimizer/gi/consts` (Priority: P1)

When a player visits any page that renders character, weapon, or artifact metadata (`@gi/good` or `@gi/presets`), the application reads from a single canonical, compactly encoded `packages/good/src/statMeta.gen.ts` module and its exported constant arrays (`ALL_CHARACTER_KEYS`, `ALL_LOCATION_CHARACTER_KEYS`, `ALL_TRAVELER_KEYS`, `ALL_WEAPON_KEYS`, `ALL_ARTIFACT_SET_KEYS`, `ALL_ARTIFACT_SLOT_KEYS`, `ALL_MAIN_STAT_KEYS`, `ALL_SUBSTAT_KEYS`, `ART_MAX_LEVEL`, `ART_SLOT_MAIN_KEYS`, `charKeyToLocCharKey`) without bundling duplicate copies of `statMeta.gen.ts` or pulling `@genshin-optimizer/gi/consts` (`85.8 KB` raw) into client chunks.

**Why this priority**: In the `bac8f21` production build baseline, `statMeta.gen.ts` (~2,100 lines, 35.5 KB raw each) was duplicated in both `packages/good/src/statMeta.gen.ts` and `packages/presets/src/statMeta.gen.ts`, and both packages imported `@genshin-optimizer/gi/consts` at runtime (`637-e2e0e5106f373f0d.js`, 85.8 KB raw). Consolidating and compacting `statMeta.gen.ts` in `@gi/good` and re-exporting it to `@gi/presets` eliminates over 120 KB of raw JavaScript across data pages.

**Independent Test**: Run `pnpm --filter @gi/good test` and `pnpm --filter @gi/presets test` to verify 100% parity of all exported keys, constants, and metadata helpers against `@genshin-optimizer/gi/consts` and `@genshin-optimizer/gi/stats`, and confirm `packages/presets/src/statMeta.gen.ts` no longer exists and neither `@gi/good` nor `@gi/presets` has any runtime import of `@genshin-optimizer/gi/consts` or `@genshin-optimizer/gi/stats`.

**Acceptance Scenarios**:

1. **Given** `packages/presets/scripts/generate-stat-meta.ts`, **When** executed, **Then** it writes a single canonical, compactly encoded `packages/good/src/statMeta.gen.ts` (and `packages/presets/src/statMeta.gen.ts` is deleted).
2. **Given** `@gi/good` (`packages/good/src/statMeta.gen.ts` and `packages/good/src/index.ts`), **When** imported by `@gi/good` or `@gi/presets`, **Then** it exports `CHAR_STAT_META`, `WEAPON_STAT_META`, `ART_SET_STAT_META`, `getCharStatMeta`, `getWeaponStatMeta`, `getArtSetStatMeta`, `ALL_CHARACTER_KEYS`, `ALL_LOCATION_CHARACTER_KEYS`, `ALL_TRAVELER_KEYS`, `ALL_WEAPON_KEYS`, `ALL_ARTIFACT_SET_KEYS`, `ALL_ARTIFACT_SLOT_KEYS`, `ALL_MAIN_STAT_KEYS`, `ALL_SUBSTAT_KEYS`, `ART_MAX_LEVEL`, `ART_SLOT_MAIN_KEYS`, and `charKeyToLocCharKey` with 100% parity against `@genshin-optimizer/gi/consts` and `@genshin-optimizer/gi/stats`.
3. **Given** all source files in `packages/good/src/` and `packages/presets/src/`, **When** scanned for runtime imports, **Then** zero files import `@genshin-optimizer/gi/consts` or `@genshin-optimizer/gi/stats` at runtime.

---

### User Story 2 - Zero-Dependency Preset Schema Validator Replacing Runtime `zod` (Priority: P1)

When presets are validated at build time, during preset registry loading, or when a user imports/creates a custom preset in the browser, `packages/presets/src/schema.ts` validates the preset using a compact, zero-dependency custom validator exposing `presetSchema.parse()` and `presetSchema.safeParse()` with identical validation rules, default application, and structured issue paths/messages — without shipping `zod` v4 (`104.3 KB` raw across two chunks) to client bundles.

**Why this priority**: `zod` v4 accounted for `104.3 KB` raw (`37.8 KB` + `66.5 KB`) in every route importing `@gi/presets`. Replacing it with a lightweight custom validator for `presetSchema` removes the entire `zod` runtime payload while preserving the exact `presetSchema.parse` / `presetSchema.safeParse` contract.

**Independent Test**: Run `pnpm --filter @gi/presets test` (`schema.test.ts`, `official.test.ts`, `match.test.ts`, `userPreset.test.ts`) to verify that valid presets pass with defaults applied (`description`, `requirement`, `conditional`, `bonusStats`, `hitMode`, `enemy`, `teamConditional`, `rotation`) and invalid presets fail with structured `error.issues` (`{ code, path, message }`) matching all structural, enum, numeric range, and `superRefine` domain rules.

**Acceptance Scenarios**:

1. **Given** any valid Akasha, Official, or User preset input (including minimal inputs relying on schema defaults), **When** `presetSchema.parse(input)` or `presetSchema.safeParse(input)` is called, **Then** it returns a normalized `Preset` object with all default fields populated identically to the previous schema implementation.
2. **Given** any invalid preset input (wrong schema ID, malformed `id` regex, out-of-range level/ascension/constellation/refinement/talent, unknown character/weapon/mainStat key, `path[0] === 'custom'`, `team[0].key !== target`, `akasha` build type mismatch, duplicate team member, missing/forbidden `akasha` block, or `id` prefix mismatch), **When** `presetSchema.safeParse(input)` is called, **Then** it returns `{ success: false, error: { issues: [...] } }` with non-empty `path` arrays and descriptive `message` strings, and `presetSchema.parse(input)` throws an Error containing the formatted issues.
3. **Given** `packages/presets/src/schema.ts` and `packages/presets/package.json`, **When** inspected, **Then** `zod` is not imported anywhere in `packages/presets/src/`.

---

### User Story 3 - Slim Route Imports on `/import` and `/presets` (Priority: P1)

When a player opens `/import` or `/presets`, Next.js only bundles the modules that route actually needs on initial render:
- `/import` loads GOOD parsing, display names, visual badges, and IndexedDB storage hooks — without bundling the 11 static preset JSON files (`53.5 KB` raw in `packages/presets/src/registry.ts`), `matchAccount`, or `userPreset`.
- `/presets` loads preset browsing, account matching, visual badges, and IndexedDB storage hooks — without bundling `parseGood` (`26.0 KB` raw in `packages/good/src/parseGood.ts`).

**Why this priority**: Even after deduplicating `statMeta.gen.ts` and removing `@genshin-optimizer/gi/consts` and `zod`, barrel imports and Next.js client chunk grouping caused `/import` to pull in `registry.ts` (all 11 preset JSON files) and `/presets` to pull in `parseGood.ts`. Slimming these imports ensures both `/import` and `/presets` First Load JS land within ~60 kB of `/` (255 kB baseline).

**Independent Test**: Run `pnpm --filter @gi/web build` and verify that the First Load JS of both `/import` and `/presets` is within 60 kB of `/` (i.e. ≤ ~315 kB when `/` is ~255 kB), and run `pnpm -r test` to confirm all `@gi/good`, `@gi/presets`, and `@gi/web` tests pass.

**Acceptance Scenarios**:

1. **Given** a production build of `apps/web` (`pnpm --filter @gi/web build`), **When** comparing route First Load JS sizes against `/`, **Then** both `/import` and `/presets` First Load JS are within ~60 kB of `/` First Load JS (down from 563 kB and 561 kB in `bac8f21`).
2. **Given** `/import` (`apps/web/src/app/import/page.tsx`), **When** bundled, **Then** it does not statically bundle `packages/presets/data/**/*.json` (`registry.ts`).
3. **Given** `/presets` (`apps/web/src/app/presets/page.tsx`), **When** bundled, **Then** it does not statically bundle `packages/good/src/parseGood.ts`.

### Edge Cases

- **Input immutability during `presetSchema.parse` / `safeParse`**: Parsing or validating a preset object MUST NOT mutate the caller's input object when applying default values (`requirement: {}`, `conditional: {}`, `enemy: { level: 100, overrides: {} }`, etc.).
- **Legacy Traveler & unknown key handling in compact `statMeta.gen.ts`**: `getCharStatMeta('Traveler')` and elemental `Traveler*` keys (including gendered `TravelerAnemoF` / `TravelerAnemoM` prefixes) must continue returning `{ ele, rarity: 5, weaponType: 'sword' }`, and unknown keys must safely return `undefined`.
- **Sub-schema exports from `packages/presets/src/schema.ts`**: External callers and tests that import `PRESET_SCHEMA_ID`, `presetSchema`, `memberRequirementSchema`, `tcCharacterSchema`, `tcWeaponSchema`, `tcBuildSchema`, `fixedBuildSchema`, `teamMemberSchema`, `rotationTargetSchema`, `presetSourceSchema`, and all TypeScript types (`Preset`, `PresetInput`, `TeamMember`, `MemberRequirement`, `RotationTarget`, `TcBuild`, `FixedBuild`, `TcCharacter`, `TcWeapon`, `PresetSource`) must remain 100% source- and type-compatible.
- **Tree-shaking across workspace barrels (`sideEffects: false`)**: Marking `@gi/good` and `@gi/presets` as `"sideEffects": false` in their `package.json` files (and avoiding top-level eager `presetSchema.parse` side effects at module evaluation time in `registry.ts` by lazily parsing `BUNDLED_PRESETS` on first access) allows webpack to completely drop `registry.ts` and the 11 JSON files from routes that only import `displayName` or `metadata` from `@gi/presets`, and to drop `parseGood.ts` from routes that only import `humanizeKey` from `@gi/good`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `packages/presets/scripts/generate-stat-meta.ts` MUST generate a single canonical `packages/good/src/statMeta.gen.ts` and `packages/presets/src/statMeta.gen.ts` MUST be deleted.
- **FR-002**: `packages/good/src/statMeta.gen.ts` MUST compactly encode character (`{ ele, rarity, weaponType }`), weapon (`{ weaponType, rarity }`), and artifact set (`{ rarities }`) metadata and export `CHAR_STAT_META`, `WEAPON_STAT_META`, `ART_SET_STAT_META`, `getCharStatMeta`, `getWeaponStatMeta`, `getArtSetStatMeta`, plus the key arrays and constants `ALL_CHARACTER_KEYS`, `ALL_LOCATION_CHARACTER_KEYS`, `ALL_TRAVELER_KEYS`, `ALL_WEAPON_KEYS`, `ALL_ARTIFACT_SET_KEYS`, `ALL_ARTIFACT_SLOT_KEYS`, `ALL_MAIN_STAT_KEYS`, `ALL_SUBSTAT_KEYS`, `ART_MAX_LEVEL`, `ART_SLOT_MAIN_KEYS`, and `charKeyToLocCharKey`.
- **FR-003**: `packages/good/src/index.ts` MUST re-export the metadata helpers and constants from `./statMeta.gen`, and `@gi/presets` (`packages/presets/src/{names,metadata,validate,userPreset,schema}.ts`) MUST consume them from `@gi/good` so neither `@gi/good` nor `@gi/presets` imports `@genshin-optimizer/gi/consts` or `@genshin-optimizer/gi/stats` at runtime.
- **FR-004**: `packages/presets/src/schema.ts` MUST replace `zod` with a zero-dependency TypeScript validator implementing `.parse(input)` and `.safeParse(input)` on `presetSchema` (and exported sub-schemas) with identical validation rules, defaults, and issue paths/messages (`{ code, path: (string | number)[], message }`).
- **FR-005**: `packages/presets/src/registry.ts` MUST lazily initialize `BUNDLED_PRESETS` and `VERIFIED_PRESET_IDS` (or avoid top-level side effects), and `@gi/good` and `@gi/presets` MUST enable clean tree-shaking (`"sideEffects": false` and/or direct module imports on `/import` and `/presets`) so `/import` does not bundle preset JSON files and `/presets` does not bundle `parseGood.ts`.
- **FR-006**: All existing unit, integration, and component tests in `@gi/good`, `@gi/presets`, and `@gi/web` MUST pass without regression.

### Key Entities

- **Canonical Compact `statMeta.gen.ts` (`packages/good/src/statMeta.gen.ts`)**: Compactly encoded character, weapon, and artifact set metadata tables + hydrated `CHAR_STAT_META`, `WEAPON_STAT_META`, `ART_SET_STAT_META` views, lookup functions, and GO key/slot/stat constant arrays.
- **Zero-Dependency `presetSchema` (`packages/presets/src/schema.ts`)**: Lightweight schema validator providing `parse(input): Preset` and `safeParse(input): SafeParseResult<Preset>` with full default hydration and domain refinement checks.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a production build (`pnpm --filter @gi/web build`), the First Load JS of `/import` and `/presets` are each within ~60 kB of the `/` route's First Load JS (down from 563 kB and 561 kB in `bac8f21` against the 255 kB `/` baseline).
- **SC-002**: Zero runtime imports of `@genshin-optimizer/gi/consts`, `@genshin-optimizer/gi/stats`, or `zod` exist in `packages/good/src/` or `packages/presets/src/`, and only one `statMeta.gen.ts` file exists in the repository (`packages/good/src/statMeta.gen.ts`).
- **SC-003**: 100% of existing and new tests in `@gi/good`, `@gi/presets`, and `@gi/web` pass (`pnpm --filter @gi/good test`, `pnpm --filter @gi/presets test`, `pnpm --filter @gi/web test`).

## Assumptions

- **SDP-A1 (`@gi/presets` Workspace Dependency on `@gi/good`)**: In accordance with Constitution Engineering Standards (`packages/good` → `packages/engine` / `packages/presets` → `apps/web`), `packages/presets/package.json` adds `"@gi/good": "workspace:*"` (and removes `"zod"`) so `@gi/presets` imports canonical metadata and key constants directly from `@gi/good`.
- **SDP-A2 (Compact Tuple/String Encoding in `statMeta.gen.ts` with Compatible Public API)**: `packages/good/src/statMeta.gen.ts` stores raw character, weapon, and artifact-set tables as compact indexed tuples/strings in the generated source (reducing raw generated code size from ~35.5 KB to <10 KB) and hydrates `CHAR_STAT_META`, `WEAPON_STAT_META`, and `ART_SET_STAT_META` once at module load so all existing callers (`CHAR_STAT_META[k]`, `getCharStatMeta(k)`, etc.) retain 100% API compatibility.
- **SDP-A3 (Tree-Shaking via `"sideEffects": false` and Lazy Bundled Preset Parsing)**: In `packages/presets/src/registry.ts`, `const BUNDLED_PRESETS = RAW_BUNDLED.map((raw) => presetSchema.parse(raw))` previously executed at module top-level, preventing webpack from tree-shaking `registry.ts` and the 11 JSON imports when `/import` imported `displayName` from `@gi/presets`. Making bundled preset parsing lazy (or memoized on first call to `listBundledPresets` / `getBundledPreset` / `getPresetBadge`) and setting `"sideEffects": false` in `packages/good/package.json` and `packages/presets/package.json` allows webpack to tree-shake unused modules cleanly.
