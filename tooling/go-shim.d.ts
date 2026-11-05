// Type boundary for the vendored Genshin Optimizer source.
//
// GO is compiled from source by Vite/webpack (see tooling/go-paths.mjs), but it
// is authored for TypeScript 6 + React 18 types, so our tsc must not typecheck
// it. Every `@genshin-optimizer/*` import is therefore untyped (`any`) via this
// shorthand ambient module; packages/engine/src/go/ re-exports what we use
// behind hand-written, narrow types, and golden-fixture tests guard behaviour.
declare module '@genshin-optimizer/*'
