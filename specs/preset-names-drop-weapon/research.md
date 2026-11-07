# Research: Bundled Preset Display Names Without Weapon References (`preset-names-drop-weapon`)

## Audit of All 11 Bundled Presets

| Preset ID | Old `name` | New `name` |
|---|---|---|
| `akasha/furina-salon-pjc-c0` | `Furina — Salon Solitaire (Primordial Jade Cutter, Avg 200 Fanfare)` | `Furina — Salon Solitaire (Avg 200 Fanfare)` |
| `akasha/furina-splendor-c2` | `Furina — Salon Solitaire C2 (Splendor of Tranquil Waters R1)` | `Furina — Salon Solitaire C2` |
| `akasha/hutao-double-hydro-homa-c1` | `Hu Tao — Double Hydro Vaporize Combo (Staff of Homa R1, C1)` | `Hu Tao — Double Hydro Vaporize Combo (C1)` |
| `akasha/neuvillette-hypercarry-protoamber-c0` | `Neuvillette — Hypercarry Double Hydro (Prototype Amber R5)` | `Neuvillette — Hypercarry Double Hydro` |
| `akasha/raiden-hypercarry-scarlet-c0` | `Raiden Shogun — Hypercarry (Sara C6 + Kazuha + Bennett, Scarlet Sands R1)` | `Raiden Shogun — Hypercarry (Sara C6 + Kazuha + Bennett)` |
| `official/arlecchino-vaporize` | `Arlecchino — Vaporize (Yelan · Bennett · Zhongli)` | Unchanged |
| `official/furina-salon-subdps` | `Furina — Salon Solitaire Sub-DPS (Double Hydro)` | Unchanged |
| `official/hutao-double-hydro-vape` | `Hu Tao — Double Hydro Vaporize (Yelan · Xingqiu · Zhongli)` | Unchanged |
| `official/mavuika-melt-hypercarry` | `Mavuika — Melt Hypercarry (Citlali · Xilonen · Bennett)` | Unchanged |
| `official/neuvillette-hypercarry` | `Neuvillette — Hypercarry (Furina · Kazuha · Zhongli)` | Unchanged |
| `official/raiden-hypercarry` | `Raiden Shogun — Hypercarry (Sara C6 · Kazuha · Bennett)` | Unchanged |

## Codebase Impact Check

- `packages/engine/src/teamData.ts` line 340 checks `team.name !== 'Furina — Salon Solitaire C2 (Splendor of Tranquil Waters R1)'` (since `seedDatabaseFromPreset` sets `team.name = preset.name`). Updating line 340 to check both `'Furina — Salon Solitaire C2'` and `'Furina — Salon Solitaire C2 (Splendor of Tranquil Waters R1)'` preserves 100% golden parity.
