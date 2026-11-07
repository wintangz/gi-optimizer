# Tasks: Buffs & Passives Human-Readable Labels (`buff-panel-labels`)

**Input**: Design documents from `/specs/buff-panel-labels/`  
**Prerequisites**: [plan.md](file:///y:/Repos/gi-optimizer/specs/buff-panel-labels/plan.md), [spec.md](file:///y:/Repos/gi-optimizer/specs/buff-panel-labels/spec.md)

## Phase 1: GO Localization & Engine Catalogue (`@gi/engine`)

- [x] T001 Implement `translateGOKey` in `tooling/go-stubs/i18n.ts` and prepack sheet-referenced English locale strings in `packages/engine/scripts/build-engine.mjs`
- [x] T002 Update `extractReactNodeText`, `collectConditionalsFromSections`, and `prettifyConditionalKey` in `packages/engine/src/catalog.ts` (and export `prettifyConditionalKey` from `packages/engine/src/index.ts`)
- [x] T003 Rebuild `@gi/engine` (`node packages/engine/scripts/build-engine.mjs`) and verify `optimizer.worker.js` stays under the 1.2 MB raw size budget

---

## Phase 2: Web UI Label & Tooltip (`@gi/web`)

- [x] T004 Update `cleanConditionalLabel` and `.gi-buff-row-label` `title` tooltip in `apps/web/src/components/ConditionalTogglePanel.tsx` to display human-readable names, prettify any fallback raw keys, and include `cond.key` in `title`

---

## Phase 3: Verification & Regression Tests

- [x] T005 Add engine unit tests in `packages/engine/test/conditional-toggle-panel.test.ts` verifying human-readable GO labels for `hpChange`, `otherHpChange`, `numOffer`, `fanfarePoints`, `charOffField`, `c2Points`, `afterUse.skill`, and fallback prettification
- [x] T006 Add component tests in `apps/web/test/ConditionalTogglePanel.test.tsx` verifying human-readable labels, fallback prettification for nameless conditionals, and raw key presence in the label `title` tooltip
- [x] T007 Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build`, measure export size, commit as `"feat: buff-panel-labels"`, and push to `origin/main`
