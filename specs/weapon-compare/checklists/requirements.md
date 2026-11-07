# Specification Quality Checklist: Weapon Comparison Mode (`weapon-compare`)

- [x] Multi-select weapons of target's weapon type (owned & unowned) with per-weapon level/ascension/refinement controls
- [x] Owned weapon defaults to user's GOOD copy; unowned defaults to Lv.90/A6/R1
- [x] Sequential per-weapon optimization under identical `OptimizerSettings` and `constraints`
- [x] Overall progress and mid-run cancel keeping completed weapons' results
- [x] Unmet constraints per weapon display `"No build meets constraints"` without failing comparison
- [x] Ranked rows (best total first) with weapon icon+name, spec, best total, `% behind leader`, `Current Baseline` marker, and expandable build details
- [x] Run-local execution: no mutation of preset, saved settings, single-weapon optimize state, or golden fixtures
- [x] Automated tests for shared stat constraints satisfaction and ER-floor ranking reversal
