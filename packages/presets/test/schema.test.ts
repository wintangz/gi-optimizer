import { describe, expect, it } from 'vitest'
import { presetSchema } from '../src/schema'

const minimal = {
  schema: 'gi-optimizer/preset@1',
  id: 'user/furina-test',
  name: 'Furina test',
  source: 'user',
  author: 'me',
  target: 'Furina',
  team: [{ key: 'Furina', build: { type: 'owned' } }],
  rotation: { targets: [{ path: ['Furina', 'skill', 'x'], count: 1 }] },
}

describe('presetSchema', () => {
  it('accepts a minimal user preset', () => {
    const r = presetSchema.safeParse(minimal)
    expect(r.success, JSON.stringify(r.error?.issues)).toBe(true)
  })
  it('rejects akasha source without akasha metadata', () => {
    const r = presetSchema.safeParse({ ...minimal, id: 'akasha/x', source: 'akasha' })
    expect(r.success).toBe(false)
  })
  it('rejects target that is not team[0]', () => {
    const r = presetSchema.safeParse({ ...minimal, target: 'Neuvillette' })
    expect(r.success).toBe(false)
  })
})
