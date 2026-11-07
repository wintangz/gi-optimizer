# Research: Cloudinary Character & Weapon Icon Images (`cdn-icon-images`)

## Decision 1: Shared CDN Base Constant & URL Helper Location
- **Decision**: Define `CLOUDINARY_GENSHIN_BASE_URL = 'https://res.cloudinary.com/ddietgxw8/image/upload/f_auto,q_auto/Genshin'` and `getCdnIconUrl(key: string): string` in `apps/web/src/lib/itemMeta.ts` and re-export them from `apps/web/src/components/Identifier.tsx`.
- **Rationale**: The prompt specifies that optimizer engine, presets data, and golden fixtures are untouched. `apps/web/src/lib/itemMeta.ts` is already the web app's single item-metadata facade imported by `Identifier.tsx` and pages.
- **Alternatives Considered**: Putting the constant in `packages/presets/src/metadata.ts` (rejected to keep `packages/presets` 100% untouched).

## Decision 2: Key-Scoped `onError` State in `CharacterBadge` and `WeaponBadge`
- **Decision**: Use `const [failedKey, setFailedKey] = useState<string | null>(null)` inside both `CharacterBadge` and `WeaponBadge`, deriving `const imageFailed = failedKey === characterKey` (or `weaponKey`).
- **Rationale**:
  1. When `imageFailed` is `false`, the component renders `<img src={getCdnIconUrl(key)} ... onError={() => setFailedKey(key)} />`.
  2. When `onError` fires (missing file like `Somnia`/`TravelerCryo`/`QuantumCatalyst`, offline, or CDN down), `setFailedKey(key)` triggers a re-render with `imageFailed === true`, which renders the exact pre-existing fallback (`meta.initials` in `CharacterBadge`, `<WeaponTypeIcon />` in `WeaponBadge`).
  3. When a user switches the character or weapon in a picker (`key` prop changes), `failedKey === key` evaluates to `false` immediately on the next render without needing a `useEffect` reset.
- **Alternatives Considered**: Boolean `useState(false)` with `useEffect` reset on `key` change (rejected because `react-hooks/set-state-in-effect` lint rule discourages synchronous `setState` in `useEffect`, whereas key-scoped state is idiomatic React).
