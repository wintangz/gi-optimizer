# Feature Specification: Naming Consistency (`naming-consistency`)

**Feature Branch**: `main`
**Created**: 2026-11-08
**Status**: Implemented

## Overview

Unify naming and badge treatment across navigation, home cards, page titles, optimizer entry points, artifact set captions, and the preset tile picker:
1. **`/teams` Destination Name (`Custom Teams`)**: Call the `/teams` destination `"Custom Teams"` in the navigation bar (`Nav.tsx`), home page card (`page.tsx`), and `/teams` page title (`teams/page.tsx`).
2. **Optimizer Entry Points (`Optimize`)**: Use the single label `"Optimize"` for all optimizer entry points across `Nav.tsx`, `page.tsx` (hero and step card), `presets/page.tsx`, and `teams/page.tsx`.
3. **Artifact Set Captions (Full Display Name)**: Caption artifact sets by their full display name (`meta.setDisplayName`, e.g. `"Crimson Witch of Flames"`, `"Emblem of Severed Fate"`, `"Viridescent Venerer"`) across `ArtifactSetFilter`, `ArtifactSetTilePicker`, and `ArtifactBadge` (used in import tables and throughout the UI).
4. **Preset-Kind Badge in `PresetTilePicker`**: Style the preset-kind badge (`AKASHA` / `OFFICIAL` / `CUSTOM`) in `PresetTilePicker` as a real pill badge (`.tile-picker-kind-badge`, `data-testid="preset-picker-badge-<id>"`), not a plain `.tile-picker-subcaption` line.

## User Scenarios & Testing

### User Story 1 — Unified `/teams` and Optimizer Labels (Priority: P1)
As a user navigating the app, I want `/teams` to be called `"Custom Teams"` everywhere (nav, home card, page heading) and all optimizer entry buttons to say `"Optimize"`.

**Independent Test**: Inspect `NAV_LINKS`, `Home`, `PresetsPage`, and `TeamsPage` and verify `/teams` is labeled `"Custom Teams"` and `/optimize` entry points are labeled `"Optimize"`.

### User Story 2 — Full Display Name for Artifact Set Captions & Real Preset-Kind Badge (Priority: P1)
As a user picking or inspecting artifact sets and presets, I want artifact sets captioned by their full display name in the set filter, tile pickers, and import tables, and I want the preset-kind indicator in `PresetTilePicker` styled as a pill badge rather than a plain subcaption.

**Independent Test**: Render `ArtifactSetFilter`, `ArtifactSetTilePicker`, `ArtifactBadge`, and `PresetTilePicker`; assert 3+ word sets like `"Crimson Witch of Flames"` and `"Emblem of Severed Fate"` render their full display name in captions, and `PresetTilePicker` renders `.tile-picker-kind-badge` instead of `.tile-picker-subcaption`.

## Functional Requirements

- **FR-001**: `/teams` MUST be labeled `"Custom Teams"` in `apps/web/src/components/Nav.tsx`, `apps/web/src/app/page.tsx`, and `apps/web/src/app/teams/page.tsx`.
- **FR-002**: Optimizer entry links/buttons MUST use the label `"Optimize"` across `Nav.tsx`, `page.tsx`, `presets/page.tsx`, and `teams/page.tsx`.
- **FR-003**: `ArtifactSetFilter`, `ArtifactSetTilePicker`, and `ArtifactBadge` MUST render `meta.setDisplayName` (full display name) rather than `meta.setShortName`.
- **FR-004**: `PresetTilePicker` MUST render the preset kind (`badge.label`) inside a styled pill badge (`.tile-picker-kind-badge`, `data-testid="preset-picker-badge-<id>"`) rather than `.tile-picker-subcaption`.
