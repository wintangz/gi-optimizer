# Research: Akasha Presets (`akasha-presets`)

## Decisions

### 1. Akasha Leaderboard Preset Modeling
- **Decision**: Model each Akasha leaderboard category as a `Preset` (`source: "akasha"`) where:
  - `team[0]` is the target character (`build.type: "owned"`) with strict `requirement` fields (`constellation`, `weapon: { key, refinement }`, `minLevel: 90`).
  - `team[1..3]` are fixed `tc` teammates matching the leaderboard's assumed support builds (weapons, artifact sets, main/substats) and conditionals (e.g. Furina Fanfare stacks, Kazuha ~1000 EM Swirl + VV 4p, Zhongli Jade Shield + Archaic Petra/Tenacity, Bennett Fantastic Voyage + Noblesse 4p, Sara Crowfeather + Elegy, Yelan Dice stacks).
  - `rotation.targets` lists every damage instance in the leaderboard's combo with its exact hit count and reaction/hitMode overrides.
- **Starter Set Shipped (`packages/presets/data/akasha/*.json`)**:
  1. `akasha/furina-salon-pjc-c0` — Furina C0 + Primordial Jade Cutter R1 (Skill summon hits: Usher ×7, Chevalmarin ×14, Crabaletta ×4 + Burst ×1, 200 avg Fanfare).
  2. `akasha/furina-splendor-c2` — Furina C2 + Splendor of Tranquil Waters R1 (intentionally fails on C0 / PJC accounts to showcase strict Akasha mismatch reporting).
  3. `akasha/neuvillette-hypercarry-sacjade-c0` — Neuvillette C0 + Sacrificial Jade R5 with Furina + Kazuha + Zhongli (`E -> Q -> 3CA`, 24 Equitable Judgment ticks + Skill + Burst).
  4. `akasha/hutao-double-hydro-homa-c1` — Hu Tao C1 + Staff of Homa R1 with Yelan + Xingqiu + Zhongli (`8× N1C Vaporize + 2× Blood Blossom + Paramita Papilio ≤50% HP`).
  5. `akasha/raiden-hypercarry-scarlet-c0` — Raiden Shogun C0 + Staff of the Scarlet Sands R1 (or Engulfing) with Sara C6 + Kazuha + Bennett (`Musou no Hitotachi` initial slash + `3× N4C + N1C` in Musou Isshin at 60 Resolve stacks).

### 2. Account Matcher (`matchAccount`)
- **Decision**: `matchAccount(preset, good, opts?: { selectedWeaponId?: string })` checks only `team` members with `build.type === 'owned'` (always `team[0]` for Akasha/Official presets; can include teammates in User presets). For each required field (`owned`, `constellation`, `weapon`, `refinement`, `level`, `talent.auto`, `talent.skill`, `talent.burst`), it emits a `MatchPartResult` with `{ part, expected, actual, ok, message, candidates? }`. If the equipped weapon doesn't match `requirement.weapon.key` (or refinement), `matchAccount` scans `good.weapons` for any owned instances of that weapon and attaches them as `candidates` so the user can select one without mutating their GOOD file.
