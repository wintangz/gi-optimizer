# Feature Specification: Official Meta Teams Expansion (`official-meta-teams`)

**Feature Branch**: `main` (`official-meta-teams`)  
**Created**: 2026-11-08  
**Status**: Implemented  
**Input**: User request:
> PART A — Akasha presets, full pull (feature family: akasha-presets)
> Pull the current Akasha leaderboard cases from akasha.cv and author an Akasha preset for every distinct case (target character + leaderboard category), refreshing the 5 existing ones against the live cases instead of duplicating them... If a case's assumptions cannot be determined from the published page, skip that case and report it — never guess stacks or buffs.
>
> PART B — Official meta teams (feature family: official-meta-teams)
> Author Official presets for the current meta teams below. For each, research the team's current best composition and standard builds from reputable meta sources (KQM guides and equivalent), and author: the 4 members with standard simulated builds (Lv.90, role-appropriate talent levels, their typical best weapons and artifact sets), a rotation modelling the team's standard damage sequence, and each member's real buffs as conditionals. Display names follow the existing rule: team/character + descriptor, never a weapon name. The existing Mavuika melt preset is refreshed/verified against the current meta build rather than duplicated.
> Teams: Mavuika Overload, Mavuika Melt, Skirk (best freeze team), Nefer (best Lunar-Bloom team), Flins (best Lunar-Charged team), Zibai, Sandrone, Vesna — for the last three, use each character's best current team.

## Clarifications & Logged Assumptions

- **Part A (`akasha-presets`) — Cloudflare Anti-Bot Challenge & No-Guessing Rule**:
  - Live `https://akasha.cv` and `https://akasha.cv/api/leaderboards` return a Cloudflare managed anti-bot challenge (`window._cf_chl_opt`, `cType: 'managed'`).
  - Per the safety policy forbidding any bypass or workaround for anti-bot / Cloudflare Turnstile challenges (including headless browsers, scripts, or alternate/cached URLs) and per the prompt's rule (*"If a case's assumptions cannot be determined from the published page, skip that case and report it — never guess stacks or buffs"*), all live `akasha.cv` cases whose published pages cannot be read are skipped and reported rather than guessed.
  - The 5 existing bundled Akasha presets (`akasha/furina-salon-pjc-c0`, `akasha/furina-splendor-c2`, `akasha/hutao-double-hydro-homa-c1`, `akasha/neuvillette-hypercarry-protoamber-c0`, `akasha/raiden-hypercarry-scarlet-c0`) remain verified against the GO conditional catalogue and golden fixtures.
- **Part B (`official-meta-teams`) — 8 Official Meta Teams**:
  1. **`official/mavuika-melt-hypercarry`** (Verified/Refreshed in place):
     - Team: `Mavuika` (target) + `Citlali` + `Xilonen` + `Bennett`
     - Already models current meta Mavuika Melt hypercarry (`ObsidianCodex` 4pc, 200 Fighting Spirit, Citlali `ScrollOfTheHeroOfCinderCity` 4pc + `ThrillingTalesOfDragonSlayers` R5, Xilonen `ArchaicPetra` 4pc + Source Sample shred, Bennett C6 `NoblesseOblige` 4pc + `AquilaFavonia` R1) and passes all GO conditional and golden checks.
  2. **`official/mavuika-overload`** (New):
     - Name: `"Mavuika — Overload (Chevreuse · Ororon · Bennett)"`
     - Team: `Mavuika` (target, `ObsidianCodex` 4pc, 200 Fighting Spirit, A1 Nightsoul Burst, A4 Kiongozi) + `Chevreuse` (C6, `FavoniusLance` R5, `SongOfDaysPast` 4pc, 40k+ HP for A1 -40% Pyro/Electro RES, A4 +40% ATK, C6 +60% Pyro/Electro DMG) + `Ororon` (C6, `ElegyForTheEnd` R1, `ScrollOfTheHeroOfCinderCity` 4pc `react_pyro`/`nightsoul_pyro`, C6 +30% ATK) + `Bennett` (C6, `AquilaFavonia` R1, `NoblesseOblige` 4pc).
     - Rotation: `1× Skill Cast + 1× Sunfell Slice Burst + 8× Flamestrider Charged Cyclic + 1× Flamestrider Charged Final`.
  3. **`official/skirk-freeze`** (New):
     - Name: `"Skirk — Freeze (Escoffier · Furina · Shenhe)"`
     - Team: `Skirk` (target, `FinaleOfTheDeepGalleries` 4pc `0EnergyNoBurst: "on"`, 3 Void Rifts absorbed via Havoc: Extinction `burstVoidAbsorb: "3"`, 3 Death's Crossing stacks `a4DeathStacks: "3"`) + `Escoffier` (C0, `SymphonistOfScents` R1, `GoldenTroupe` 4pc, A4 -55% Cryo/Hydro RES `a4SkillBurstHit: "on"`, weapon +32% ATK `healing: "on"`) + `Furina` (C0, `FavoniusSword` R5, `TenacityOfTheMillelith` 4pc, `burstFanfare: "250"`, `skill: "cast"`) + `Shenhe` (C0, `CalamityQueller` R1, `NoblesseOblige` 4pc, `quill: "quill"`, `burst: "burst"`, `asc1: "field"`, `asc4Hold: "hold"`).
     - Rotation: `3× N5 + 1× CA` in Seven-Phase Flash mode (`skill.0` ×3, `skill.1` ×3, `skill.2` ×6, `skill.3` ×6, `skill.4` ×3, `skill.chargedDmg` ×3).
  4. **`official/nefer-lunar-bloom`** (New):
     - Name: `"Nefer — Lunar-Bloom (Lauma · Columbina · Nahida)"`
     - Team: `Nefer` (target, `NightOfTheSkysUnveiling` 4pc `4GleamingMoon: "on"`, `a1VeilStacks: "3"`, `burstVeilsAbsorbed: "3"`) + `Lauma` (C0, `NightweaversLookingGlass` R1, `SilkenMoonsSerenade` 4pc, `skillAfterHit: "on"`, `burstPaleHymn: "on"`, `a1AfterSkill: "on"`) + `Columbina` (C0, `NocturnesCurtainCall` R1, `AubadeOfMorningstarAndMoon` 4pc, `burstDomain: "on"`, `a1Stacks: "3"`) + `Nahida` (C0, `AThousandFloatingDreams` R1, `DeepwoodMemories` 4pc, `partyInBurst: "on"`, `condA1ActiveInBurst: "on"`, `moonsignAfterSkillBurst: "on"`).
     - Rotation: `2× Skill Cast + 6× Phantasm Performance (Nefer 1-Hit, Nefer 2-Hit, Shades 1-Hit, Shades 2-Hit, Shades 3-Hit Lunar-Bloom) + 1× Burst (1-Hit & 2-Hit)`.
  5. **`official/flins-lunar-charged`** (New):
     - Name: `"Flins — Lunar-Charged (Ineffa · Columbina · Sucrose)"`
     - Team: `Flins` (target, `NightOfTheSkysUnveiling` 4pc `4GleamingMoon: "on"`) + `Ineffa` (C0, `FracturedHalo` R1, `SilkenMoonsSerenade` 4pc, `a4AfterBurst: "on"`, `afterSkillBurst: "on"`, `afterShield: "on"`) + `Columbina` (C0, `NocturnesCurtainCall` R1, `TenacityOfTheMillelith` 4pc, `burstDomain: "on"`, `a1Stacks: "3"`, `skill: "cast"`) + `Sucrose` (C6, `ThrillingTalesOfDragonSlayers` R5, `ViridescentVenerer` 4pc, `swirlelectro: "electro"`, `skillHit: "hit"`, `moonsignAfterSkillBurst: "on"`, `Heritage: "on"`).
     - Rotation: `2× Northland Spearstorm + 2× Thunderous Symphony (Initial + Additional Lunar-Charged) + 2× N5 Manifest Flame`.
  6. **`official/zibai-lunar-crystallize`** (New):
     - Name: `"Zibai — Lunar-Crystallize (Illuga · Columbina · Linnea)"`
     - Team: `Zibai` (target, `NightOfTheSkysUnveiling` 4pc `4GleamingMoon: "on"`, `a1Moonfall: "on"`) + `Illuga` (C6, `FavoniusLance` R5, `SilkenMoonsSerenade` 4pc, `burstSong: "on"`, `a1AfterSkillBurst: "on"`, `c4BurstActive: "on"`) + `Columbina` (C0, `NocturnesCurtainCall` R1, `AubadeOfMorningstarAndMoon` 4pc, `burstDomain: "on"`, `a1Stacks: "3"`) + `Linnea` (C0, `GoldenFrostboundOath` R1, `HuskOfOpulentDreams` 4pc, `a1Lumi: "on"`, `skillOrLc: "on"`, `moondrift: "on"`, `stack: "4"`).
     - Rotation: `1× Burst (1-Hit & 2-Hit Lunar-Crystallize) + 3× N4 Lunar Phase Shift (including 4-Hit Gleam Lunar-Crystallize) + 3× Spirit Steed's Stride (1-Hit & 2-Hit Lunar-Crystallize)`.
  7. **`official/sandrone-stellar-conduct`** (New):
     - Name: `"Sandrone — Stellar-Conduct (Odette · Alyosha · Xilonen)"`
     - Team: `Sandrone` (target, `DisenchantmentInDeepShadow` 4pc `state: "on"`, `a0StellarRadianceSc: "on"`, `a1Decoding: "on"`, `a1Tactics: "10"`) + `Odette` (C0, `WhitelakeFrostfeather` R1, `HeartOfTheFurnace` 4pc, `a0StellarRadiance: "sc"`, `a1TeamSplendor: "4"`, `skillAfterSpecial: "on"`, `a4Stacks: "2"`, `4Stellar: "on"`) + `Alyosha` (C6, `SymphonistOfScents` R1, `NoblesseOblige` 4pc, `skillPrecision: "2"`, `a0StellarRadianceSc: "on"`, `c4Heal: "on"`, `healing: "on"`, `set4: "on"`) + `Xilonen` (C0, `FavoniusSword` R5, `TenacityOfTheMillelith` 4pc, `sourceActive: "on"`, `skill: "cast"`).
     - Rotation: `1× Decoding Sweeping Fire + 6× Condensed Beam (Stellar-Conduct) + 2× 1st Prism Shot + 2× 2nd Prism Shot (Stellar-Conduct) + 3× Q.E.D. Bombardment + 1× Convective Inhibition Ray (Stellar-Conduct)`.
  8. **`official/vesna-stellar-swirl`** (New):
     - Name: `"Vesna — Stellar Swirl (Odette · Vodyanitsa · Faruzan)"`
     - Team: `Vesna` (target, `ScarletProof` 4pc `4Ss: "on"`, `skillArmed: "on"`, `a0StellarRadiance: "ss"`, `a1Stacks: "6"`) + `Odette` (C0, `WhitelakeFrostfeather` R1, `HeartOfTheFurnace` 4pc, `a0StellarRadiance: "ss"`, `a1TeamSplendor: "4"`, `skillAfterSpecial: "on"`, `a4Stacks: "2"`, `4Stellar: "on"`) + `Vodyanitsa` (C0, `HymnOfTheMaelstrom` R1, `TenacityOfTheMillelith` 4pc, `skillHit: "on"`, `a1Vortex: "on"`, `a4LeadVocal: "on"`, `a4Chorus: "on"`, `stacks: "3"`, `frozenSwirl: "on"`, `skill: "cast"`) + `Faruzan` (C6, `ElegyForTheEnd` R1, `NoblesseOblige` 4pc, `burstBenefit: "on"`, `burstHit: "on"`, `a4Active: "on"`, `c6Crit: "on"`, `ThePartingRefrain: "on"`, `set4: "on"`).
     - Rotation: `1× Skill Cast + 5× Burst Spirit Blade (Stellar Swirl) + 6× Wind Pinion + 1× Lv. 1 Windborne Sword + 1× Lv. 2 Windborne Sword + 1× Lv. 2 Spirit Blade (Stellar Swirl) + 4× Lv. 3 Spirit Blade Initial (Stellar Swirl) + 1× Lv. 3 Spirit Blade Final (Stellar Swirl)`.

## Requirements *(mandatory)*

- **FR-001**: Every new preset MUST validate against `presetSchema` (`gi-optimizer/preset@1`) and `validatePreset`, with weapon-free display names.
- **FR-002**: Every conditional key and state value across all bundled presets MUST pass `validatePresetConditionalsAgainstGO(preset)` with zero issues.
- **FR-003**: Every new preset MUST have a golden reference fixture in `packages/engine/test/golden/official__<slug>.json` verified against direct GO calculation in `packages/engine/test/golden.test.ts` and be listed in `VERIFIED_PRESET_IDS`.
- **FR-004**: Each new preset MUST be committed individually with commit message `feat: preset-<preset-id>` and pushed to `origin/main`.
