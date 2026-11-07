# Implementation Plan: Reset File Input Value After Pick (`import-file-repick`)

**Branch**: `import-file-repick` | **Date**: 2026-11-08 | **Spec**: `specs/import-file-repick/spec.md`

## Summary

Reset `e.target.value = ''` immediately after capturing `const file = e.target.files?.[0]` in `handleFileChange` (`apps/web/src/app/import/page.tsx`) and `handleImportFile` (`apps/web/src/app/teams/page.tsx`) so selecting the same file path a second time always triggers a `change` event.

## Technical Context

- **Language/Version**: TypeScript 5.x, React 19, Next.js 15
- **Testing**: Vitest (`apps/web/test/ImportPage.test.tsx`)

## Project Structure

- `apps/web/src/app/import/page.tsx`: Reset `e.target.value = ''` in `handleFileChange`.
- `apps/web/src/app/teams/page.tsx`: Reset `e.target.value = ''` in `handleImportFile`.
- `apps/web/test/ImportPage.test.tsx`: Add test verifying `e.target.value` is reset to `''` after picking a file and that picking the same file again processes the updated file contents.
