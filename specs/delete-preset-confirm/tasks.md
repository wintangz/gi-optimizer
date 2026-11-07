# Tasks: Delete Preset Confirmation

- [x] **T001**: Add inline delete confirmation state (`confirmDeletePresetId`) to `apps/web/src/app/presets/page.tsx` and `apps/web/src/app/teams/page.tsx`, ensuring `removeUserPreset` and `router.push('/presets')` only run after explicit confirmation.
- [x] **T002**: Add regression tests in `apps/web/test/teams-deferred-start.test.tsx` verifying delete confirmation and cancellation on both `/teams` and `/presets`.
- [x] **T003**: Run tests and commit as `feat: delete-preset-confirm`.
