# Implementation Plan: User-Facing Language (`user-facing-language`)

## Summary

Replace internal engine keys, raw JSON paths, and developer jargon across `presets/page.tsx`, `teams/page.tsx`, `import/page.tsx`, `ConditionalTogglePanel.tsx`, and `OptimizeViews.tsx` with plain user-facing language.

## Technical Design

1. **Human-Readable Conditionals (`ConditionalTogglePanel.tsx`, `presets/page.tsx`, `teams/page.tsx`)**:
   - Export `formatHumanConditionalEntry(sheetKey, condKey, stateValue, catalog?)` from `ConditionalTogglePanel.tsx`, backed by `cleanConditionalLabel`, `formatStateOptionLabel`, GO conditional descriptors, and `prettifyConditionalKey`.
   - Render formatted conditional entries in `presets/page.tsx` (`Active Conditionals` column) and `teams/page.tsx` (`Active Conditionals` member list).

2. **Formula Labels & Rotation Tables (`OptimizeViews.tsx`, `presets/page.tsx`, `teams/page.tsx`)**:
   - Add `humanizeFormulaPath(path)` and update `formatRotationRowLabel(label, fallbackPath)` in `OptimizeViews.tsx` so empty or raw dot-path labels fall back to human formula names (`Elemental Skill — 1-Hit DMG`).
   - Remove `<th>GO Formula Path</th>` and its `<td><code>` cell from `presets/page.tsx`.
   - In `teams/page.tsx`, rename `GO Formula Target` to `Damage Formula` and remove `(${t.path.join('.')})` from visible `<option>` text while keeping `title={pathKey}`.

3. **Plain-Language Import Diagnostics (`OptimizeViews.tsx`, `import/page.tsx`)**:
   - Export `formatParseIssuePlain(issue: ParseIssue)` to translate raw paths (`artifacts[812].substats[1].key` → `Artifact #813: Substat #2 has an unknown type`) and render plain-word diagnostics in `import/page.tsx`.

4. **Teams Draft Banner, Team Results Labels, & Akasha Link (`teams/page.tsx`, `OptimizeViews.tsx`, `presets/page.tsx`)**:
   - Remove `(Unverified Setup Bundle)` warning text in `teams/page.tsx`.
   - In `TeamOptimizationList` (`OptimizeViews.tsx`), replace `"Disjoint 5pc Assignment"` with `"Artifacts assigned without overlap"` and `"SLOT N"` member pills with `{displayName(mKey)}`.
   - In `presets/page.tsx`, set the Akasha provenance anchor text to `"Akasha leaderboard case"` with `title={activePreset.akasha.leaderboardUrl}`.
