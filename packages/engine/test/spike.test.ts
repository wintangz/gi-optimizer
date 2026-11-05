// Feasibility spike: GO's own code path (ArtCharDatabase + getTeamData +
// uiDataForTeam) computing damage headlessly from a GOOD file.
import { SandboxStorage } from '@genshin-optimizer/common/database'
import { ArtCharDatabase } from '@genshin-optimizer/gi/db'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GO_ROOT } from '../../../tooling/go-paths.mjs'
import { getTeamData } from '../../../vendor/genshin-optimizer/libs/gi/ui/src/hooks/useTeamData'
import { uiDataForTeam } from '@genshin-optimizer/gi/uidata'

describe('GO engine spike', () => {
  it('computes Furina damage via GO team data', () => {
    const good = JSON.parse(
      readFileSync(resolve(GO_ROOT, 'libs/gi/db/src/Database/Van_2025-07-16_19-59-13.json'), 'utf8')
    )
    const db = new ArtCharDatabase(1, new SandboxStorage())
    db.importGOOD(good, false, false, false)
    const tcId = db.teamChars.new('Furina')
    const teamId = db.teams.new({})
    db.teams.set(teamId, (t) => {
      t.loadoutData[0] = { teamCharId: tcId, buildType: 'equipped' } as never
    })
    const bundle = getTeamData(db, teamId, tcId, 0)!
    const calc = uiDataForTeam(bundle.teamData, 'F', 'Furina')
    const ui = calc['Furina']!.target
    const display = ui.getDisplay()
    const sections = Object.keys(display)
    console.log('sections', sections)
    const skill = display['Furina'] ?? display
    console.log(JSON.stringify(Object.fromEntries(Object.entries(skill).map(([k, v]) => [k, Object.fromEntries(Object.entries(v as object).map(([n, node]) => [n, (node as { value: number }).value]))])), null, 1).slice(0, 3000))
    expect(sections.length).toBeGreaterThan(0)
  })
})

