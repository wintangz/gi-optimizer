---
name: "GI Optimizer"
description: "Dark-room theorycrafting workbench and five-stage solver cockpit for Genshin Impact artifact optimization."
colors:
  leyline-cobalt: "#6ea0ff"
  leyline-cobalt-bright: "#8db6ff"
  leyline-frost: "#f0f5ff"
  leyline-cobalt-tint: "rgba(110, 160, 255, 0.16)"
  leyline-cobalt-wash: "rgba(110, 160, 255, 0.28)"
  verdigris-signal: "#4cc38a"
  verdigris-signal-tint: "rgba(76, 195, 138, 0.16)"
  amber-caution: "#f2b84b"
  amber-caution-tint: "rgba(242, 184, 75, 0.16)"
  crimson-fault: "#ff6b6b"
  crimson-fault-tint: "rgba(255, 107, 107, 0.16)"
  abyssal-slate: "#0d1017"
  trench-inset: "#11151f"
  obsidian-panel: "#161b26"
  astral-slate: "#202736"
  astral-hover: "#283145"
  instrument-control: "#273044"
  instrument-control-hover: "#313c54"
  seam-subtle: "#242c3d"
  structural-border: "#2f3950"
  focus-steel: "#465475"
  starlight-title: "#f5f7fc"
  chalk-body: "#eef1f8"
  slate-section: "#d2d9ea"
  muted-telemetry: "#949eb8"
  obsidian-ink: "#090c12"
typography:
  display:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "1.55rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  section-display:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.25
  headline:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "1.15rem"
    fontWeight: 700
    lineHeight: 1.3
  metric:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "0.92rem"
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: "0.02em"
  body:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "0.84rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.03em"
  muted:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "0.82rem"
    fontWeight: 500
    lineHeight: 1.35
  caption:
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
    fontSize: "0.78rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.03em"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  pill: "999px"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.25rem"
  xxl: "1.75rem"
  stage-row-gap: "10px"
  stage-gap: "14px"
  stage-card: "15px"
  stage-panel: "22px"
components:
  button-primary:
    backgroundColor: "{colors.leyline-cobalt}"
    textColor: "{colors.obsidian-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.55rem 0.95rem"
  button-primary-hover:
    backgroundColor: "{colors.leyline-cobalt-bright}"
    textColor: "{colors.obsidian-ink}"
  button-secondary:
    backgroundColor: "{colors.instrument-control}"
    textColor: "{colors.chalk-body}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.85rem"
  button-secondary-hover:
    backgroundColor: "{colors.instrument-control-hover}"
    textColor: "{colors.starlight-title}"
  chip-filter:
    backgroundColor: "{colors.trench-inset}"
    textColor: "{colors.chalk-body}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.35rem 0.72rem"
  chip-filter-active:
    backgroundColor: "{colors.leyline-cobalt-tint}"
    textColor: "{colors.leyline-frost}"
    rounded: "{rounded.pill}"
  card-stage:
    backgroundColor: "{colors.astral-slate}"
    textColor: "{colors.chalk-body}"
    rounded: "{rounded.lg}"
    padding: "{spacing.stage-card}"
  panel-stage:
    backgroundColor: "{colors.obsidian-panel}"
    textColor: "{colors.chalk-body}"
    rounded: "{rounded.lg}"
    padding: "{spacing.stage-panel}"
  input-field:
    backgroundColor: "{colors.trench-inset}"
    textColor: "{colors.chalk-body}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0.45rem 0.65rem"
---

# Design System: GI Optimizer

## Overview

**Creative North Star: "The Theorycrafter's Flight Deck"**

GI Optimizer is a high-density, nocturnal theorycrafting workbench built for players and competitive optimizers who cross-check artifact rolls, damage formulas, and leaderboard assumptions. Its visual world behaves like an instrument-grade flight deck: calm, low-glare slate surfaces recede into the background so that solver controls, active buffs, and numerical deltas command immediate attention. Every visual signal on screen earns its place by encoding either workflow state, game semantics (element, rarity, ownership), or quantitative change.

The aesthetic philosophy prioritizes operational scannability over theatrical flourish. Complex multi-character configurations are tamed through a strict three-level surface hierarchy, tabular numeric alignment, and progressive disclosure via summary rows, popup editor modals, and single-open inline accordions. The system explicitly rejects marketing hero bloat, decorative glassmorphism over dense data tables, and alarmist red "error" styling on neutral negative stat trade-offs.

**Key Characteristics:**
- **Dark-Room Telemetry Palette:** A three-tier slate surface hierarchy (`#0d1017` → `#161b26` → `#202736`) with a recessed inset track (`#11151f`) that keeps long optimization sessions effortless on the eyes.
- **Single-Accent Command Focus:** Leyline Cobalt (`#6ea0ff`) is reserved for primary solver actions, selected tabs, active filter pills, and focus rings so the user's eye can trace active state across all five stages in a single glance.
- **Semantic Delta Discipline:** Positive damage gains and satisfied constraints light up in Verdigris Signal (`#4cc38a`), setup discrepancies and SIM fallbacks surface in Amber Caution (`#f2b84b`), and neutral stat trade-offs remain cool slate rather than error red.
- **Tabular Instrument Typography:** Native system sans-serif paired with mandatory `tabular-nums` alignment across stat grids, substat roll tables, and damage comparison rows, adhering to a strict minimum readable floor (`0.78rem`).
- **Progressive Disclosure Architecture:** Summary rows launch focused modal editors for configuration (Fast Mode, Weapon Effects, Pool Filters, Stat Constraints), while build comparisons expand inline one row at a time.

## Colors

A disciplined dark-mode slate palette anchored by a single luminous cobalt accent and strictly partitioned semantic status signals.

### Primary
- **Leyline Cobalt** (`#6ea0ff`): The primary interactive accent used for the "Run Optimization" CTA, active stage tabs, selected filter chips, checked toggles, and `1px` active card rings.
- **Leyline Cobalt Bright** (`#8db6ff`): Hover and highlighted state for primary buttons and active links.
- **Leyline Frost** (`#f0f5ff`): High-contrast foreground text inside active cobalt-tinted pills, badges, and selected member tabs.
- **Leyline Cobalt Tint** (`rgba(110, 160, 255, 0.16)`): Translucent fill for selected filter pills, active navigation tabs, and highlighted target markers.
- **Leyline Cobalt Wash** (`rgba(110, 160, 255, 0.28)`): Stronger translucent fill for active hover states and emphasized badge backgrounds.

### Secondary
- **Verdigris Signal** (`#4cc38a` / tint `rgba(76, 195, 138, 0.16)`): Positive semantic signal for net damage gains (`+X.X%`), owned roster badges, and satisfied stat constraints.
- **Amber Caution** (`#f2b84b` / tint `rgba(242, 184, 75, 0.16)`): Advisory signal for SIM-assumed teammates, "setup differs" candidate indicators, and non-blocking solver warnings.
- **Crimson Fault** (`#ff6b6b` / tint `rgba(255, 107, 107, 0.16)`): Destructive and fault signal reserved exclusively for infeasible solver states, validation errors, and net-negative total build damage.

### Neutral
- **Abyssal Slate** (`#0d1017`): Level 1 root page canvas (`--surface-page`).
- **Trench Inset** (`#11151f`): Recessed well surface (`--surface-inset`) for form inputs, unselected filter chips, code/formula blocks, and stat comparison tracks.
- **Obsidian Panel** (`#161b26`): Level 2 container surface (`--surface-panel`) for the five numbered optimization stages, sticky navigation bar, and modal shells.
- **Astral Slate** (`#202736`): Level 3 elevated card surface (`--surface-card`) for member editors, preset cards, weapon candidates, and build result rows.
- **Astral Hover** (`#283145`): Interactive hover surface (`--surface-hover`) for clickable cards, weapon rows, and summary rows.
- **Instrument Control** (`#273044` / hover `#313c54`): Default and hover fill (`--control`, `--control-hover`) for secondary action buttons and compact header triggers.
- **Seam Subtle** (`#242c3d`): Low-contrast internal hairline (`--border-subtle`) for table row dividers and stat grid separators.
- **Structural Border** (`#2f3950`): Default `1px solid` perimeter stroke (`--border`) defining panels, cards, and inputs.
- **Focus Steel** (`#465475`): Emphasized border stroke (`--border-strong`) on hovered cards and focused controls.
- **Starlight Title** (`#f5f7fc`): Primary display and card heading text (`--text-title`).
- **Chalk Body** (`#eef1f8`): Default high-legibility body and stat value text (`--text-body`).
- **Slate Section** (`#d2d9ea`): Secondary subheadings, table headers, and category labels (`--text-section`).
- **Muted Telemetry** (`#949eb8`): Supporting metadata, base stat labels, and inactive descriptions (`--text-muted`).
- **Obsidian Ink** (`#090c12`): High-contrast dark label text rendered atop solid Leyline Cobalt primary buttons.

### Named Rules
**The Single Accent Rule.** Leyline Cobalt (`#6ea0ff`) is the sole interactive brand accent across the entire application. Do not introduce secondary decorative brand colors for buttons or tabs; all other chromatic accents must represent either semantic status (Verdigris, Amber, Crimson) or authentic Genshin Impact domain data (elemental affinities and 1★–5★ item rarity).

**The Neutral Trade-Off Rule.** Individual stat decreases inside a build comparison (such as trading `-12% CRIT DMG` for `+18% ATK%` to achieve a higher total rotation result) are neutral analytical facts, not errors. Render individual stat decreases in Muted Telemetry (`#949eb8`) or Slate Section (`#d2d9ea`); reserve Crimson Fault (`#ff6b6b`) strictly for net-negative total build damage or broken constraints.

## Typography

**Display Font:** `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
**Body Font:** `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
**Label/Mono Font:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace` (for GOOD JSON payloads and formula path keys; numeric tables use the primary sans-serif with `font-variant-numeric: tabular-nums`)

**Character:** Zero-latency native system sans-serif engineered for dense numerical scannability. Rather than relying on decorative display serifs, hierarchy is achieved through tight weight contrasts (`600`–`700` vs `400`), uppercase micro-tracking on section headers, and strict tabular figure alignment.

### Hierarchy
- **Display** (`700`, `1.55rem`, line-height `1.2`, letter-spacing `-0.01em`): Top-level page titles (`.gi-page-title`).
- **Section Display** (`700`, `1.25rem`, line-height `1.25`): Prominent modal and sub-panel titles.
- **Headline** (`700`, `1.15rem`, line-height `1.3`): Numbered stage headers (Stages 1–5), modal dialog titles, and primary panel headings (`--font-title`).
- **Metric** (`700`, `1rem`, line-height `1.3`): Primary damage figures and emphasized numeric readouts (`tabular-nums`).
- **Title** (`600`, `0.92rem`, line-height `1.35`, letter-spacing `0.02em`): Card titles, preset names, character names in member tabs, and subsection headers (`--font-section`).
- **Body** (`400`, `0.95rem`, line-height `1.5`): Standard control copy, passive/buff descriptions, and stat table values (`--font-body`). Constrain descriptive prose to `65ch–75ch` so explanations remain easy to scan.
- **Label / Muted / Caption** (`600`, `0.78rem–0.84rem`, line-height `1.3–1.35`, letter-spacing `0.03em`): Filter chips (`0.84rem` / `--font-chip`), supporting metadata (`0.82rem` / `--font-muted`), and compact badges or floor captions (`0.78rem`).

### Named Rules
**The 0.78rem Floor Rule.** No text anywhere in the interface—including substat roll pills, rarity badges, or table footnotes—may drop below `0.78rem` (`12.5px`). Density must be achieved through compact padding and summary-row disclosure, never by shrinking type into illegibility.

**The Tabular Telemetry Rule.** Every column, badge, or inline span that renders stats, percentages, damage outputs, refinement ranks, or roll values must apply `font-variant-numeric: tabular-nums` so vertical columns align to the pixel as values update.

## Layout

The layout centers on a five-stage **Dual-Deck Instrument Panel** on the `/optimize` workbench (`max-width: 1200px`, centered with `1rem–1.5rem` horizontal padding), pairing an upper setup deck (Stages 1–3) with a side-by-side lower solver deck (Stages 4–5 on viewports `>= 1120px`), complemented by a header wayfinding telemetry strip and responsive multi-column grids for preset selection, member tabs, and artifact piece inspection.

- **Stage Pipeline Rhythm:** The `/optimize` page arranges five numbered `Obsidian Panel` (`#161b26`) stages across two coordinated decks with `14px` (`--space-stage-gap`) between major groups, `22px` (`--space-stage-panel`) internal stage padding, and `10px` (`--space-stage-row-gap`) between summary rows. On desktop (`>= 1120px`), Stages 1 & 2 pair horizontally in the upper setup row (`1.55fr` / `1fr` when in Single-Character or Team mode) above Stage 3's 4-column member selector, while Stage 4 (Artifact Settings & Constraints, sticky `0.78fr` left rail) sits beside Stage 5 (Optimization & Results, `1.42fr` right canvas).
- **Card & Grid Density:** Internal cards use `15px` (`--space-stage-card`) padding. Preset grids and candidate grids use `grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))` with `0.75rem` (`12px`) gaps. Artifact piece strips display 5 columns across in full-width views (`repeat(5, minmax(0, 1fr))`) and `repeat(auto-fit, minmax(150px, 1fr))` inside the split lower deck.
- **Responsive Breakpoints:**
  - `1120px`: Dual-deck split collapses gracefully into a single-column vertical flow while preserving DOM stage order (`Stage 1 → 2 → 3 → 4 → 5`).
  - `960px`: Multi-column stage split panels and 5-column artifact rows collapse to 2-column or stacked layouts.
  - `768px`: Member selector tabs wrap into a 2×2 grid; modal dialogs expand to near-full viewport width (`calc(100vw - 1.5rem)`).
  - `640px`: Summary rows stack action buttons cleanly; page padding tightens to `0.75rem`.

## Elevation & Depth

GI Optimizer uses a **3-Level Tonal Layering + Structural Border** model. Surfaces are completely flat at rest: depth is communicated by stepping upward in slate luminance from the root canvas (`#0d1017`) to stage panels (`#161b26`) to interactive cards (`#202736`), while carving input wells and chip tracks downward into Trench Inset (`#11151f`). Every surface boundary is crisply delineated by a `1px solid` structural border (`#2f3950`), eliminating the need for ambient drop shadows across the workbench.

### Shadow Vocabulary
- **Active Selection Ring** (`box-shadow: inset 0 0 0 1px #6ea0ff`): Applied to selected preset cards, active member tabs, and active weapon candidates in combination with border color `#6ea0ff`.
- **Modal Dialog Elevation** (`box-shadow: 0 20px 48px rgba(0, 0, 0, 0.6)`): Reserved strictly for popup modal dialogs (Weapon Picker, Fast Mode Editor, Candidate Effects, Pool Filters, Stat Constraints) layered over a `rgba(6, 9, 14, 0.72)` backdrop with `backdrop-filter: blur(3px)`.

### Named Rules
**The Three-Surface Rule.** Never nest more than three distinct background surface levels (`Page #0d1017` → `Panel #161b26` → `Card #202736`, plus `Inset #11151f` for recessed controls) within a single view. When a card requires deep sub-configuration, open a focused modal or use a `1px` subtle seam (`#242c3d`) rather than inventing a fourth card-inside-card-inside-card surface tone.

**The Flat-At-Rest Rule.** Do not apply drop shadows to cards, rows, or stage panels at rest or on hover. Shadows exist only to separate modal overlays from the workbench canvas.

## Shapes

The form language is compact, geometric, and instrument-grade, using tight nested corner radii so inner controls sit concentrically inside outer panels:

- **Stage Panels, Cards, and Modals:** Moderately rounded corners (`12px` / `--radius-lg`) with a crisp `1px solid #2f3950` border.
- **Buttons, Summary Rows, and Member Tabs:** Tactile medium corners (`8px` / `--radius-md`) that nest cleanly inside `12px` card containers.
- **Form Inputs, Selects, and Stat Cells:** Tight corners (`6px` / `--radius-sm`) for numeric fields, dropdowns, and compact stat blocks.
- **Micro Badges & Rarity Tags:** Sharp-edged utility corners (`4px` / `--radius-xs`) for inline KV tags, refinement ranks (`R1`–`R5`), and level indicators.
- **Filter Chips & Status Pills:** Full capsule geometry (`999px` / `--radius-pill`) reserved for toggleable filter chips, stage number badges, and owned/SIM status pills so toggleable tags are immediately distinguishable from action buttons.

## Components

Every component is tactile, compact, and instrument-grade—built with crisp `1px` borders, immediate background/border state transitions (`120ms–150ms ease`), and zero decorative bounce.

### Buttons
- **Shape:** Tactile medium corners (`8px` radius) with `600` weight label typography (`0.84rem`–`0.9rem`).
- **Primary (`.btn-primary`, `.btn-run-primary`):** Solid Leyline Cobalt (`#6ea0ff`) background, Obsidian Ink (`#090c12`) text, `1px solid #6ea0ff` border, and `0.55rem 0.95rem` padding (`0.68rem 1.25rem` on the primary solver CTA).
- **Hover / Focus:** Primary buttons brighten to Leyline Cobalt Bright (`#8db6ff`); all buttons display a `2px solid #6ea0ff` outline with `2px` offset on `:focus-visible`. Disabled buttons drop to `0.5` opacity with `cursor: not-allowed`.
- **Secondary / Control (`.gi-btn`, `.btn-secondary`):** Instrument Control (`#273044`) background with Chalk Body (`#eef1f8`) text and a `1px solid #2f3950` border, shifting to `#313c54` and border `#465475` on hover.

### Chips
- **Style:** Full capsule (`999px` radius), `0.35rem 0.72rem` padding, `0.82rem` `600`-weight text, `1px solid #2f3950` border over Trench Inset (`#11151f`).
- **State:** Unselected chips sit recessed in `#11151f` with `#eef1f8` text; selected filter chips shift to Leyline Cobalt Tint (`rgba(110, 160, 255, 0.16)`), border `#6ea0ff`, and Leyline Frost (`#f0f5ff`) text.

### Cards / Containers
- **Corner Style:** `12px` radius (`--radius-lg`) for stage panels and cards; `8px` radius (`--radius-md`) for compact summary rows.
- **Background:** Obsidian Panel (`#161b26`) for top-level stage containers; Astral Slate (`#202736`) for member editors, preset cards, and build comparison rows.
- **Shadow Strategy:** Flat at rest per the Flat-At-Rest Rule; active selection adds `inset 0 0 0 1px #6ea0ff`.
- **Border:** `1px solid #2f3950` default; `#465475` on interactive hover; `#6ea0ff` when selected.
- **Internal Padding:** `22px` (`--space-stage-panel`) on stage panels; `15px` (`--space-stage-card`) on cards; `0.65rem 0.85rem` on compact summary rows.

### Inputs / Fields
- **Style:** Recessed Trench Inset (`#11151f`) background, `1px solid #2f3950` stroke, `6px` radius (`--radius-sm`), Chalk Body (`#eef1f8`) text with `tabular-nums` for numeric inputs, and `0.45rem 0.65rem` padding.
- **Focus:** Border shifts to Leyline Cobalt (`#6ea0ff`) with `outline: 1px solid #6ea0ff`.
- **Error / Disabled:** Validation errors apply border `#ff6b6b` and tint `rgba(255, 107, 107, 0.16)`; disabled fields render at `0.55` opacity.

### Navigation
- **Style:** Sticky top header bar (`background: rgba(13, 16, 23, 0.88)`, `backdrop-filter: blur(8px)`, bottom border `1px solid #242c3d`) containing the brand title on the left and horizontal route pills (`Optimize`, `Presets`, `Artifacts`, `Characters`, `Import`) on the right.
- **States:** Inactive links render in Muted Telemetry (`#949eb8`) with `8px` radius and `0.4rem 0.75rem` padding; hover shifts to Chalk Body (`#eef1f8`) on `#202736`; active route displays Leyline Frost (`#f0f5ff`) on `rgba(110, 160, 255, 0.16)` with a `1px solid rgba(110, 160, 255, 0.45)` border.

### Stage Summary Row & Chevron Toggle (Signature Component)
- **Character:** The core progressive-disclosure primitive used across Stages 3 and 4 and build result lists.
- **Summary Row + Modal Trigger:** Secondary configuration groups (Fast Mode, Candidate Effects, Pool Filters, Stat Constraints) render as a single-line `8px`-radius row (`#202736` background, `1px solid #2f3950` border) displaying the setting title on the left, a live one-line state summary in the center (e.g., `Stat Constraints — ER ≥ 200%`), and a compact `Edit` action button on the right that opens the corresponding modal dialog.
- **Unified Chevron Toggle (`ChevronToggle`):** All inline expanders (Artifact Set Filter & Protected Characters, Build Details accordion rows, and Rotation/Formula breakdown trees) use the shared SVG chevron component (`16×16` stroke icon, `aria-expanded`, smooth `transform: rotate(180deg)` transition) positioned at the trailing edge of the control—never ASCII triangles (`▼`, `▸`) or `[Show]`/`[Hide]` text literals.

## Do's and Don'ts

### Do:
- **Do** preserve the three-level dark slate hierarchy (`#0d1017` Page → `#161b26` Stage Panel → `#202736` Card, with `#11151f` Inset wells) and `1px solid #2f3950` borders across all views.
- **Do** apply `font-variant-numeric: tabular-nums` to every stat value, damage number, percentage delta, refinement rank, and roll efficiency metric.
- **Do** use the shared SVG `ChevronToggle` component for all inline expand/collapse controls, and enforce single-open accordion behavior on build details rows.
- **Do** use summary rows paired with focused popup modals (`box-shadow: 0 20px 48px rgba(0, 0, 0, 0.6)`) for secondary editors (Fast Mode, Candidate Effects, Pool Filters, Stat Constraints) so stage cards never balloon in height.
- **Do** keep all text at or above the `0.78rem` (`12.5px`) minimum font size floor.

### Don't:
- **Don't** use literal text toggles (`[Show]`, `[Hide]`, `Hide details`) or raw Unicode arrow glyphs (`▸`, `▼`, `▲`, `▾`, `▴`) anywhere in the UI.
- **Don't** color individual negative stat trade-offs in Crimson Fault (`#ff6b6b`); reserve red strictly for net-negative total build damage, broken constraints, or destructive actions.
- **Don't** introduce decorative drop shadows on resting cards or panels, glassmorphic blurs over data tables, or marketing hero banners above the workbench.
- **Don't** repeat a character's build-state badge (`Fixed by Case`, `Fixed Spec`, `Owned`) or duplicate member cards within Stage 3—each member appears once in the selector tabs with a single unified editor below.
