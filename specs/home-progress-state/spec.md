# Feature Specification: Home Progress State (`home-progress-state`)

**Feature Branch**: `main`
**Created**: 2026-11-08
**Status**: Implemented

## Overview

The home page (`/`) previously rendered a static getting-started flow that always showed `"Step 1: Import Account Data"` as undone even when a GOOD dataset was already stored in the browser. When GOOD data is stored:
1. Step 1 (`Import Account Data`) displays a done state (`data-step-status="done"`, checkmark badge `✓`, `"Done"` label) with the stored character, weapon, and artifact counts (`data-testid="home-step-1-counts"`) and a re-import link (`data-testid="home-step-1-reimport"`).
2. The flow points the user at the next step (`Step 2: Pick or Build a Preset`, `data-step-status="next"`, `"Next Step"` indicator and primary CTA).

## User Scenarios & Testing

### User Story 1 — Reflect Stored GOOD Data on Home Page (Priority: P1)
As a returning user with GOOD data already imported, I want the Home page to show Step 1 as completed with my stored character/weapon/artifact counts and a re-import link, and highlight the next step so I know where to go next.

**Independent Test**: Render `Home` both with `record = null` and with a stored GOOD record (`3 characters, 12 weapons, 150 artifacts`); assert that without data Step 1 is undone (`1`) and with data Step 1 is done (`✓`, shows counts and re-import link) and Step 2 is marked as the next step.

## Functional Requirements

- **FR-001**: `apps/web/src/app/page.tsx` MUST read stored GOOD account state via `useGoodStorage()`.
- **FR-002**: When `record?.good` is present, Step 1 (`data-testid="home-step-1"`) MUST show a done state (`data-step-status="done"`), display the stored counts of characters, weapons, and artifacts (`data-testid="home-step-1-counts"`), and provide a re-import link (`data-testid="home-step-1-reimport"`).
- **FR-003**: When `record?.good` is present, the getting-started flow MUST visually point the user at Step 2 (`data-testid="home-step-2"`, `data-step-status="next"`, `data-testid="home-step-2-next-pill"`).
- **FR-004**: When no GOOD data is stored (`record === null`), the existing undone Step 1 presentation MUST remain intact.
