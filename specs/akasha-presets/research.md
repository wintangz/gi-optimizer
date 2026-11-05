# Research: Akasha Presets (`akasha-presets`)

## Decisions

### 1. Akasha Leaderboard Preset Modeling (Already Verified)
- **Decision**: Model each Akasha leaderboard category as a `Preset` (`source: "akasha"`) where:
  - `team[0]` is the target character (`build.type: "owned"`) with strict `requirement` fields (`constellation`, `weapon: { key, refinement }`, `minLevel: 90`).
  - `team[1..3]` are fixed `tc` teammates matching the leaderboard's assumed support builds (weapons, artifact sets, main/substats) and conditionals (e.g. Furina Fanfare stacks, Kazuha ~1000 EM Swirl + VV 4p, Zhongli Jade Shield + Archaic Petra/Tenacity, Bennett Fantastic Voyage + Noblesse 4p, Sara Crowfeather + Elegy, Yelan Dice stacks).
  - `rotation.targets` lists every damage instance in the leaderboard's combo with its exact hit count and reaction/hitMode overrides.
- **Starter Set Shipped (`packages/presets/data/akasha/*.json`)**:
  1. `akasha/furina-salon-pjc-c0` — Furina C0 + Primordial Jade Cutter R1 (Skill summon hits: Usher ×7, Chevalmarin ×14, Crabaletta ×4 + Burst ×1, 200 avg Fanfare).
  2. `akasha/furina-splendor-c2` — Furina C2 + Splendor of Tranquil Waters R1 (intentionally fails on C0 / PJC accounts to showcase strict Akasha mismatch reporting).
  3. `akasha/neuvillette-hypercarry-sacjade-c0` — Neuvillette C0 + Sacrificial Jade R5 with Furina + Kazuha + Zhongli (`E -> Q -> 3CA`, 24 Equitable Judgment ticks + Skill + Burst).
  4. `akasha/hutao-double-hydro-homa-c1` — Hu Tao C1 + Staff of Homa R1 with Yelan + Xingqiu + Zhongli (`8× N1C Vaporize + 2× Blood Blossom + Paramita Papilio ≤50% HP`).
  5. `akasha/raiden-hypercarry-scarlet-c0` — Raiden Shogun C0 + Staff of the Scarlet Sands R1 with Sara C6 + Kazuha + Bennett (`Musou no Hitotachi` initial slash + `3× N4C + N1C` in Musou Isshin at 60 Resolve stacks).

### 2. Account Matcher (`matchAccount` — Target-Only Matching)
- **Decision**: `matchAccount(preset, good, opts?: { selectedWeaponId?: string })` checks only `team` members with `build.type === 'owned'` (always `team[0]` for Akasha/Official presets). Supporting teammates with `build.type === 'tc'` are never checked against the account.
- **Rationale**: Akasha leaderboards evaluate a player's single character + weapon + artifacts under a standardized, simulated team context.

### 3. Visual Representation of Target vs. Simulated (`tc`) Teammates in UI
- **Decision**: Never render a preset team as a flat list of 4 equal names (`p.team.map(...).join(' / ')` or `.join(' · ')`). Across `/presets` (both list cards and detail table) and `/optimize` (preset summary bar), render structured team pills/rows where:
  - `team[0]` (`build.type === 'owned'`) is explicitly badged `"Your Character · Target"`.
  - Each `team[1..3]` member with `build.type === 'tc'` is visually marked with a `SIM` badge, a dashed border/ring (`border: '1px dashed ...'`), and a `"Simulated / Assumed Preset Build (Not Your Account)"` label/tooltip.
- **Rationale**: Prevents users from assuming that the 4 team members are treated equally or drawn from their imported GOOD roster.
- **Alternatives considered**: Showing plain text "(TC)" next to teammate names — rejected because "TC" is internal GO jargon and easily overlooked compared to a `SIM` badge + dashed ring + explicit "Not Your Account" label.

### 4. Target-Only Compatibility Copy on `/presets` and `/optimize`
- **Decision**: Replace all generic account-check copy on `/presets` (`apps/web/src/app/presets/page.tsx`) and `/optimize` (`apps/web/src/app/optimize/page.tsx`) with target-specific wording:
  - Heading: `"Target Character & Weapon Check"`
  - Unimported GOOD prompt: `"Import your GOOD JSON on the Import page to check whether your target character and weapon satisfy this preset."`
  - Top banner on `/presets` when no GOOD is imported: `"No GOOD account data imported yet. Import your scanner file to check whether your target character and weapon satisfy a preset and run the optimizer."`
- **Rationale**: Eliminates misleading wording such as `"whether your scanned characters and weapons satisfy this preset"` that implied supporting teammates were checked.

### 5. Engine Teammate-Isolation Regression Test
- **Decision**: Add `packages/engine/test/akasha-isolation.test.ts` testing `session.evaluate` and `session.optimize` on bundled Akasha presets (e.g. `akasha/neuvillette-hypercarry-sacjade-c0` and `akasha/furina-salon-pjc-c0`) across two GOOD payloads that have the exact same target character, target weapon, and eligible artifact pool (`includeEquippedOnOthers: false` or unequipped pool), while GOOD #2:
  1. Deletes all supporting teammate characters (`Furina`, `KaedeharaKazuha`, `Zhongli`) from `good.characters`, OR
  2. Mutates all supporting teammates in `good.characters` to Lv.1 C6 Talent 15/15/15 and swaps their equipped weapons/artifacts in `good.weapons` / `good.artifacts`.
  Both sessions must produce identical `RotationResult` (`total`, `instances`, `stats`) and identical `OptimizeResult` (`builds`).
- **Rationale**: Formally proves that `hydrateTeamIntoDb` (`db.buildTcs.new(...)` + `loadoutData[i].buildType = 'tc'`) completely isolates `tc` teammates from the user's GOOD teammate characters and weapons.

### 6. Custom Team Builder (`/teams`) Fork Preservation & Labelling
- **Decision**:
  - In `apps/web/src/app/teams/page.tsx`, when a preset is forked (`?fork=` or via the "Load or Fork Existing Preset" selector), teammates with `build.type === 'tc'` remain `build.type === 'tc'` (via `forkPresetToUser`), and their card header/selector clearly displays a `SIM` badge + dashed border and `"Simulated / Assumed Preset Build (Not Your Account)"` label, keeping their assumed level, constellation, weapon, and artifact set editable.
  - Add a dedicated unit test in `packages/presets/test/userPreset.test.ts` asserting that `forkPresetToUser` on both Akasha and Official presets preserves `build.type === 'tc'` and deep-equals all `tc` character, weapon, and artifact stats on every teammate (`team[1..3]`).
- **Rationale**: Ensures that customizing a preset never silently switches simulated teammates to the user's scanned characters.
