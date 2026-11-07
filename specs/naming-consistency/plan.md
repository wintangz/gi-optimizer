# Implementation Plan: Naming Consistency (`naming-consistency`)

**Branch**: `main` | **Date**: 2026-11-08 | **Spec**: [spec.md](file:///y:/Repos/gi-optimizer/specs/naming-consistency/spec.md)

## Summary

1. **`/teams` and Optimizer Entry Labels**:
   - `apps/web/src/components/Nav.tsx`: change `{ href: '/teams', label: 'Custom teams' }` to `{ href: '/teams', label: 'Custom Teams' }`.
   - `apps/web/src/app/page.tsx`: change hero `/optimize` button (`Open Optimizer` → `Optimize`), Step 2 `/teams` button (`Custom Builder` → `Custom Teams`), and Step 3 `/optimize` button (`Optimize Builds` → `Optimize`).
   - `apps/web/src/app/teams/page.tsx`: change `<h1 className="gi-page-title">Custom Team &amp; Preset Builder</h1>` to `<h1 className="gi-page-title">Custom Teams</h1>`.
2. **Artifact Set Full Display Names**:
   - `apps/web/src/components/ArtifactSetFilter.tsx`: render `{meta.setDisplayName}` in `.tile-picker-caption`.
   - `apps/web/src/components/TilePickers.tsx` (`ArtifactSetTilePicker`): render `{meta.setDisplayName}` in `.tile-picker-caption`.
   - `apps/web/src/components/Identifier.tsx` (`ArtifactBadge`): render `<strong>{meta.setDisplayName}</strong>` in `data-testid="artifact-set-chip"`.
3. **Preset-Kind Badge in `PresetTilePicker`**:
   - `apps/web/src/components/TilePickers.tsx`: render `<span className={\`tile-picker-kind-badge is-\${badge.kind}\`} data-testid={\`preset-picker-badge-\${p.id}\`}>{badge.label}</span>` instead of `.tile-picker-subcaption`.
   - `apps/web/src/app/globals.css`: add `.tile-picker-kind-badge` (and `.is-akasha`, `.is-official`, `.is-user` variants) with rounded pill borders, background fill, and uppercase badge typography.
