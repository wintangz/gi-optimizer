// Feasibility spike: GO's own code path (ArtCharDatabase + getTeamData +
// uiDataForTeam) computing damage headlessly from a GOOD file.
import { SandboxStorage } from '@genshin-optimizer/common/database'
import { ArtCharDatabase, type LoadoutDatum } from '@genshin-optimizer/gi/db'
import { getTeamData } from '@genshin-optimizer/gi/ui/useTeamData'
import { uiDataForTeam } from '@genshin-optimizer/gi/uidata'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GO_ROOT } from '../../../tooling/go-paths.mjs'

describe('GO engine spike', () => {
  it('computes Furina damage via GO team data', () => {
    const good = JSON.parse(
      readFileSync(
        resolve(GO_ROOT, 'libs/gi/db/src/Database/Van_2025-07-16_19-59-13.json'),
        'utf8'
      )
    )
    const db = new ArtCharDatabase(1, new SandboxStorage())
    db.importGOOD(good, false, false, false)
    const tcId = db.teamChars.new('Furina')
    const teamId = db.teams.new({})
    db.teams.set(teamId, (t: { loadoutData: Array<LoadoutDatum | undefined> }) => {
      t.loadoutData[0] = { teamCharId: tcId, buildType: 'equipped' } as never
    })
    const bundle = getTeamData(db, teamId, tcId, 0)!
    const calc = uiDataForTeam(bundle.teamData, 'F', 'Furina')
    const ui = calc['Furina']!.target
    const display = ui.getDisplay()
    const sections = Object.keys(display)
    expect(sections.length).toBeGreaterThan(0)
  })
})


