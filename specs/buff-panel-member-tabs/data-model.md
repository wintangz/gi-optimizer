# Data Model: Buffs & Passives Member Switcher Tabs & Worn-Set Filtering (`buff-panel-member-tabs`)

## UI State (`ConditionalTogglePanel`)

- `selectedMemberKey: string` (local React state, initialized to `preset.team[0]?.key ?? ''` and falling back to `preset.team[0]?.key ?? ''` if the selected character is not in `preset.team`).
- Persisted `OptimizerSettings.memberConditionals` shape (`Record<presetId, Record<characterKey, MemberConditionalsMap>>`) is unchanged.
