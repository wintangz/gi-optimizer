# Tasks: Visual Identifiers (`visual-identifiers`)

**Input**: Design documents from `/specs/visual-identifiers/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

## Phase 1: Foundational Metadata Lookup & Tests (`@gi/presets` + `apps/web/src/lib/itemMeta.ts`)

**Purpose**: Provide canonical, framework-free metadata lookup (`getCharacterMeta`, `getWeaponMeta`, `getArtifactMeta`, element/rarity/set color tokens, 2-letter initials, weapon-type & slot glyphs) backed by vendored `@genshin-optimizer/gi/stats`.

- [x] T001 Implement `getCharacterMeta`, `getWeaponMeta`, `getArtifactMeta`, `getCharacterInitials`, `getElementColor`, `getRarityColor`, and `getSetHue` in `packages/presets/src/metadata.ts` (enforcing 2-letter uppercase initials `[A-Z0-9]{2}`, element colors for all 7 elements, rarity colors for `1..5`, deterministic hue in `0..359` from `setKey`, weapon-type glyphs for `sword | claymore | polearm | bow | catalyst`, and slot glyphs for `flower | plume | sands | goblet | circlet` plus set emblem fallback) and re-export from `packages/presets/src/index.ts`
- [x] T002 [P] Create convenience re-export module in `apps/web/src/lib/itemMeta.ts` re-exporting all metadata types and helpers from `@gi/presets`
- [x] T003 [P] Write exhaustive metadata unit tests in `packages/presets/test/metadata.test.ts` verifying `getCharacterMeta` across `ALL_CHARACTER_KEYS` (including Traveler variants and unknown fallback), `getWeaponMeta` across `ALL_WEAPON_KEYS` (rarity `1..5` and weapon type), and `getArtifactMeta` across `ALL_ARTIFACT_SET_KEYS` and all 5 slots

---

## Phase 2: User Story 1 & 2 - Shared Visual Identifier Component Library & Simulated Teammate Treatment (Priority: P1) 🎯 MVP

**Goal**: Provide a single shared React component library (`CharacterBadge`, `WeaponBadge`, `ArtifactBadge`, `ItemIdentifier`) rendering element-colored character circles with 2-letter initials, dashed ring + `"SIM"` / `"SIM · Fixed Preset Build"` pill badges for simulated (`tc`) teammates, `"YOURS · TARGET"` / `"YOUR BUILD"` tags for owned characters, rarity-colored weapon circles with weapon-type SVG/Unicode glyphs, and deterministic set/rarity-colored artifact circles with slot SVG/Unicode glyphs.

**Independent Test**: Render `CharacterBadge` (`simulated={true}`, `role="target"`, `role="owned"`), `WeaponBadge` (1★–5★ and all 5 weapon types), `ArtifactBadge` (all 5 slots + set-only mode), and `ItemIdentifier` in Vitest (`apps/web/test/Identifier.test.tsx`) and assert markup, colors, initials, glyphs, and `SIM` / `YOURS · TARGET` pills.

- [x] T004 [US1] [US2] Implement `CharacterBadge`, `WeaponBadge`, `ArtifactBadge`, and `ItemIdentifier` in `apps/web/src/components/Identifier.tsx` with inline SVG + accessible Unicode glyphs, element/rarity/set color circles, dashed outer ring + `"SIM · Fixed Preset Build"` (or compact `"SIM"`) pill when `simulated={true}`, and `"YOURS · TARGET"` / `"YOUR BUILD"` pills when `role="target" | "owned"`
- [x] T005 [P] [US1] [US2] Write component unit tests in `apps/web/test/Identifier.test.tsx` verifying `CharacterBadge` owned vs. target vs. `simulated={true}` rendering (dashed ring + `SIM` pill), `WeaponBadge` rarity color and weapon-type glyph rendering, `ArtifactBadge` set hue, rarity border, and slot glyph rendering, and `ItemIdentifier` dispatch

---

## Phase 3: User Story 3 - Cross-Screen Integration Across `/import`, `/presets`, `/optimize`, and `/teams` (Priority: P1/P2)

**Goal**: Replace every text-only character, weapon, and artifact display across all four primary screens with the shared visual identifier components so that identical items look identical everywhere and simulated (`tc`) teammates are immediately distinguishable at a glance.

**Independent Test**: Build and inspect `/import`, `/presets`, `/optimize`, and `/teams`; verify zero text-only character/weapon/artifact cells remain and all workspace tests (`pnpm -r test`), typechecks (`pnpm -r typecheck`), and static export (`pnpm --filter @gi/web build`) pass.

- [x] T006 [P] [US1] [US3] Update `apps/web/src/app/import/page.tsx` to render `CharacterBadge`, `WeaponBadge`, and `ArtifactBadge` in the Characters table (character name, equipped weapon, equipped 2p/4p artifact sets), Weapons table (weapon name, equipped character), and Artifacts table (artifact set, slot with slot glyph, equipped character)
- [x] T007 [P] [US1] [US2] [US3] Update `apps/web/src/app/presets/page.tsx` to render `CharacterBadge` (with `role="target"` for target and `simulated={m.build.type === 'tc'}` / `role="owned"` for teammates), `WeaponBadge`, and `ArtifactBadge` in the preset list cards, Account Compatibility Check weapon candidates preview, and Team & Buff Assumptions table (character, build source pill, required weapon, TC assumed weapon, and TC assumed artifact sets)
- [x] T008 [P] [US1] [US2] [US3] Update `apps/web/src/app/optimize/page.tsx` to render `CharacterBadge`, `WeaponBadge`, and `ArtifactBadge` in the preset compatibility & team roster summary (with `role="target"` and `simulated` badges), qualifying weapon copy preview, Protected Characters chips (`CharacterBadge compact`), Excluded Artifact Sets chips (`ArtifactBadge compact`), and Artifact Loadout Comparison table (slot badge + current and optimised `ArtifactBadge` with equipped character `CharacterBadge compact`)
- [x] T009 [P] [US1] [US2] [US3] Update `apps/web/src/app/teams/page.tsx` to render `CharacterBadge` (with `role="target"` on slot 1, `simulated={member.build.type === 'tc'}` on TC teammates, and `role="owned"` on owned teammates), `WeaponBadge` for TC assumed weapon, `ArtifactBadge` for TC assumed 4-piece artifact set, and `CharacterBadge` in the Target Rotation and Live Rotation Preview headers

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Foundational Metadata Lookup)**: No internal dependencies — starts immediately.
- **Phase 2 (Shared Identifier Component Library)**: Depends on T001 and T002.
- **Phase 3 (Cross-Screen Route Updates)**: Depends on T004 (`apps/web/src/components/Identifier.tsx`). All four route tasks (T006, T007, T008, T009) touch distinct page files and can execute in parallel `[P]`.

### Dependencies on Other Features

- `good-import` (`docs/architecture.md` — `apps/web/src/app/import/page.tsx`, `@gi/good` types `ICharacter`, `IWeapon`, `IArtifact`): Consumed to render imported inventory rows.
- `akasha-presets` & `official-presets` (`docs/architecture.md` — `packages/presets/src/schema.ts`, `packages/presets/src/names.ts`, `apps/web/src/app/presets/page.tsx`): Consumed for `displayName`, preset `team` members (`build.type === 'owned' | 'tc'`), and preset browsing UI.
- `single-character-optimizer` (`docs/architecture.md` — `apps/web/src/app/optimize/page.tsx`): Consumed for preset summary, protected characters, excluded sets, and slot-by-slot artifact comparison.
- `custom-teams-and-presets` (`docs/architecture.md` — `apps/web/src/app/teams/page.tsx`): Consumed for team member cards (`owned` vs `tc`) and rotation builder headers.
