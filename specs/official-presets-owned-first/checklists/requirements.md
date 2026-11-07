# Specification Quality Checklist: Official Presets Owned-First Teammate Resolution (`official-presets-owned-first`)

**Purpose**: Validate specification completeness and quality before proceeding to planning  
**Created**: 2026-11-07  
**Feature**: [spec.md](file:///y:/Repos/gi-optimizer/specs/official-presets-owned-first/spec.md)

## Content Quality

- [x] No unlogged assumptions
- [x] Focused on user value and engine/UI correctness
- [x] All mandatory sections completed

## Requirement Completeness

- [x] Official-only scope (`preset.source === 'official'`) and Akasha byte-identical invariant specified
- [x] Owned-first resolution rule and unowned fallback (`forcedSimulated`) specified
- [x] Conditional derivation rule (worn-set + equipped-weapon conditionals for `'owned'` vs `member.conditional` for `'tc'`) specified
- [x] Per-member toggle UI, visible simulated labelling, and `OptimizerSettings.memberBuildModes` persistence specified
- [x] Golden fixture re-baseline and test pinning requirements specified
