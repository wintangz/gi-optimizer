# Data Model & State Transitions: Deferred Engine Start on Custom Teams Page (`teams-deferred-start`)

## 1. `/teams` Deferred Engine State (`apps/web/src/app/teams/page.tsx`)

No IndexedDB schema, preset JSON schema (`packages/presets/src/schema.ts`), or `@gi/engine` public API contracts are modified by this feature. All state changes are internal to `TeamsInner` in `apps/web/src/app/teams/page.tsx`.

```ts
interface TeamsEngineLifecycleState {
  /**
   * False on initial `/teams` mount when neither `?fork=` nor `?edit=` is present.
   * Transitions to `true` (and stays `true` for the component lifetime) upon:
   *  - Initial mount or navigation with `?fork=<id>` or `?edit=<id>`
   *  - Any user interaction with preset loading/forking/importing, target/teammate controls,
   *    conditionals, rotation rows/dropdowns, enemy overrides, or the "Load Engine & Preview" button.
   */
  engineStarted: boolean

  /** True while `getCatalogInWorker` is in flight after `engineStarted === true`. */
  catalogLoading: boolean

  /** True while the debounced (150ms) `evaluatePresetInWorker` call is pending/in flight after `engineStarted === true`. */
  previewLoading: boolean

  /** True when `previewLoading` is true and `!isEngineSessionHydrated(record.importedAt)`. */
  previewHydrating: boolean

  /** Cached GO formula target descriptors keyed by characterKey, populated once `engineStarted === true`. */
  targetsByChar: Record<string, TargetDescriptor[]>

  /** Cached GO conditional descriptors keyed by characterKey, populated once `engineStarted === true`. */
  conditionalsByChar: Record<string, ConditionalDescriptor[]>

  /** Latest rotation evaluation result or validation/missing-GOOD message. */
  livePreview: {
    result?: RotationResult
    error?: string
  }
}
```

## 2. State Machine & Transitions

```text
[Initial Mount on /teams]
   │
   ├── URL has ?fork=<id> or ?edit=<id> ──────────────────────┐
   │                                                          ▼
   └── No query params                               [Engine Active]
         │                                           (engineStarted = true)
         ▼                                                    │
  [Deferred Shell State]                                      ├──► getCatalogInWorker(teamKeys)
  (engineStarted = false)                                     │      └─ catalogLoading = true ──► Spinner("Loading optimizer engine…")
  - Zero Worker constructor calls                             │
  - Preset list & builder controls rendered                   └──► evaluatePresetInWorker(draft) (150ms debounce when record?.good present)
  - Rotation <select> shows fallback <option>                        └─ previewLoading = true
  - Preview panel shows "Load Engine & Preview" CTA                     ├─ if !hydrated || catalogLoading: Spinner("Loading optimizer engine…")
         │                                                              ├─ else: Spinner("Evaluating…")
         └── First user interaction OR "Load Engine & Preview" click ───┘
```

## 3. UI & Accessibility Contracts in Deferred vs. Active States

1. **Deferred State (`engineStarted === false`)**:
   - `getCatalogInWorker` and `evaluatePresetInWorker` are **not** called.
   - Live Rotation Preview panel renders an idle prompt explaining that the calculation engine loads on first interaction, accompanied by a `<button type="button">Load Engine & Preview</button>` button.
   - Each rotation target row's `"GO Formula Target"` `<select>` renders a fallback `<option value={normPathKey}>{rt.label ? `${rt.label} (${normPathKey})` : normPathKey}</option>` when `targetCatalog` does not yet contain `normPathKey`.
2. **Initializing / Evaluating State (`engineStarted === true && (catalogLoading || previewLoading)`)**:
   - Header of Live Rotation Preview panel renders `<Spinner label={previewHydrating || catalogLoading ? 'Loading optimizer engine…' : 'Evaluating…'} size="sm" inline />`.
   - Body of Live Rotation Preview panel renders `<SkeletonBlock height={28} count={4} gap="0.45rem" />` until the first `livePreview.result` or `livePreview.error` is ready.
3. **Ready State (`engineStarted === true && !previewLoading`)**:
   - Displays total rotation damage (`Total: <N> DMG`) and the per-instance breakdown table (`Instance`, `Count`, `Per-Hit DMG`, `Subtotal DMG`), or `livePreview.error` if no GOOD file is imported or the draft fails validation.
