# Feature Specification: User-Facing Language (`user-facing-language`)

## Overview

Replace developer/internal engine terminology and raw data paths across user-facing surfaces with plain, human-readable language while keeping all underlying data structures, calculations, and golden fixtures unchanged.

## User Scenarios & Testing

### US1 — Human-Readable Active Conditionals (P1)
- In the Presets detail table (`Active Conditionals` column) and Teams editor member cards, active conditionals are displayed using human-readable conditional names and state labels from the same label source as the Buffs & Passives panel (`ConditionalTogglePanel`), instead of raw engine keys such as `GoldenTroupe.set4 = on`.

### US2 — Human-Readable Rotation Formula Names & Dropdown Options (P1)
- The Presets detail rotation table removes the raw `GO Formula Path` column (`skill.0`); a row's display label always falls back to a human formula name (`Elemental Skill — 1-Hit DMG`), never a raw path.
- The Teams editor's formula dropdown drops the raw `(skill.0)` suffix from visible `<option>` text while keeping the raw formula path in the `title` tooltip.

### US3 — Plain-Language Import Parse Diagnostics (P1)
- Import parse diagnostics describe the entry and field in plain words (e.g. `Artifact #813: Substat #2 has an unknown type ('critRate')`) instead of rendering raw JSON data paths like `artifacts[812].substats[1].key`.

### US4 — Provenance Badges, Team Results Banner/Member Pills, & Akasha Link Label (P1)
- The Teams editor removes the warning-styled `(Unverified Setup Bundle)` banner above every draft, leaving only the clean preset kind badge.
- Team optimization results replace `"Disjoint 5pc Assignment"` with `"Artifacts assigned without overlap"` and replace `"SLOT 1/2/3"` member pills with each member's display name.
- The Akasha provenance link displays a short human label (`"Akasha leaderboard case"`) instead of the full URL.

## Requirements

- **FR-001**: Export a shared conditional formatter from `ConditionalTogglePanel.tsx` using the same GO conditional label and state formatting logic as the Buffs & Passives panel, and use it in `presets/page.tsx` and `teams/page.tsx`.
- **FR-002**: Remove the `GO Formula Path` column from the preset rotation table, ensure rotation row labels fall back to humanized formula names (`humanizeFormulaPath`), and drop the `(<path>)` suffix from visible option text in the Teams editor formula `<select>` (preserving `title` tooltips).
- **FR-003**: Format import parse diagnostics in plain words (`Artifact #813`, `Character #1`, `Weapon #5`, etc.) without raw bracketed JSON paths in visible text.
- **FR-004**: Remove `(Unverified Setup Bundle)` from the Teams editor header, replace `"Disjoint 5pc Assignment"` with `"Artifacts assigned without overlap"` and `"SLOT 1/2/3"` pills with `displayName(memberKey)` in `TeamOptimizationList`, and render `"Akasha leaderboard case"` as the visible link text in the Akasha provenance box.
- **FR-005**: Wording and layout only — no changes to calculation, solver behavior, or golden fixtures.
