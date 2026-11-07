# Tasks: Reset File Input Value After Pick

- [x] **T001**: Reset `e.target.value = ''` in `handleFileChange` (`apps/web/src/app/import/page.tsx`) and `handleImportFile` (`apps/web/src/app/teams/page.tsx`).
- [x] **T002**: Add regression test in `apps/web/test/ImportPage.test.tsx` verifying that picking a file resets `e.target.value` to `''` and allows re-picking the same file.
- [x] **T003**: Run tests and commit as `feat: import-file-repick`.
