# Data Model: CharacterBadge Image vs. Fallback State Styling (`badge-image-state-style`)

## `CharacterBadge` Visual States (`apps/web/src/components/Identifier.tsx`)

| State | Condition | Default Size | Compact Size | Avatar Border | Avatar Content |
|---|---|---|---|---|---|
| **Image State** | `imageFailed === false` | `34px` (`30 + 4`) | `27px` (`24 + 3`) | `2px solid ${meta.elementColor.border}` | `<img src={iconUrl} ... />` |
| **Fallback State** | `imageFailed === true` | `30px` | `24px` | `2px dashed ${meta.elementColor.border}` | `{meta.initials}` |
