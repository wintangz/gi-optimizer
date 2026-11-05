# Research: Official Presets (`official-presets`)

## Decisions

### 1. Meta Team Selection & GO Sheet Alignment
- **Decision**: Author 6 Official meta presets (`packages/presets/data/official/*.json`) whose characters, weapons, artifact sets, conditionals, and rotation display paths are verified directly against `vendor/genshin-optimizer/libs/gi/sheets`:
  1. `official/neuvillette-hypercarry` — Neuvillette (`team[0]`, owned) + Furina (TC, C0, Fanfare 250) + Kaedehara Kazuha (TC, C0, 1000 EM, VV 4p Hydro shred + A4 Hydro DMG) + Zhongli (TC, C0, Jade Shield RES shred + Archaic Petra 4p Hydro DMG). Rotation: 24× `charged.judgment` + 1× `skill.skillDmg` + 1× `burst.skillDmg` + 2× `burst.waterfallDmg`.
  2. `official/furina-salon-subdps` — Furina (`team[0]`, owned) + Neuvillette (TC) + Kaedehara Kazuha (TC, VV Hydro shred + EM buff) + Baizhu (TC). Rotation: 7× `skill.usherDmg` + 14× `skill.chevalmarinDmg` + 4× `skill.crabalettaDmg` + 1× `burst.skillDmg`.
  3. `official/hutao-double-hydro-vape` — Hu Tao (`team[0]`, owned) + Yelan (TC) + Xingqiu (TC) + Zhongli (TC, Jade Shield). Rotation: 8× (`normal.0` + `charged.dmg` with `reaction: "vaporize"`) + 2× `skill.dmg` + 1× `burst.lowHpDmg` (`reaction: "vaporize"`), with Paramita Papilio and ≤50% HP conditionals active.
  4. `official/raiden-hypercarry` — Raiden Shogun (`team[0]`, owned) + Kujou Sara (TC, C6 Crowfeather) + Kaedehara Kazuha (TC, VV Electro) + Bennett (TC, Fantastic Voyage + Noblesse 4p). Rotation: 1× `burst.dmg` + 3× (`burst.hit1` + `burst.hit2` + `burst.hit3` + `burst.hit41` + `burst.hit42` + `burst.charged1` + `burst.charged2`) at 60 Resolve stacks.
  5. `official/arlecchino-vaporize` — Arlecchino (`team[0]`, owned) + Yelan (TC) + Bennett (TC, Fantastic Voyage + Noblesse 4p) + Zhongli (TC, Jade Shield). Rotation: 2× N1–N5 sequence in Masque of the Red Death (`normal.0`..`normal.4` + `normal.masqueDmg` with Vaporize on ICD hits) + `skill.spikeDmg` + `skill.finalDmg`.
  6. `official/mavuika-melt-hypercarry` — Mavuika (`team[0]`, owned) + Citlali (TC, Pyro RES shred + Scroll of the Hero of Cinder City 4p) + Xilonen (TC, Source Sample Pyro shred) + Bennett (TC, Fantastic Voyage + Noblesse 4p). Rotation: 1× `burst.skillDmg` (`reaction: "melt"`) + 8× Flamestrider Charged Attack cyclic/final hits (with Melt on reactive hits).

