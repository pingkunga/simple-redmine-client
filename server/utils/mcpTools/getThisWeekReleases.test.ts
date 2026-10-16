import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getThisWeekReleases, getThisWeekReleasesTool } from './getThisWeekReleases'
import { getThisWeekVersions } from '../releaseService'

vi.mock('../releaseService', () => ({ getThisWeekVersions: vi.fn() }))

const ctx = { redmineUrl: 'http://r', headers: { k: 'v' } }
const release = (over: Record<string, unknown> = {}) => ({
  id: 10, name: '8.9.14.1', description: 'free text', due_date: '2026-10-18',
  versionDueDateWorkingDayText: '16-OCT-2026', ownerTeam: 'Team Invest',
  currentReleaseBranch: 'release/8.9.14', currentBuildSeries: '8.9.14.X', buildFor: '',
  nextWeekReleaseVersion: '8.9.14.2', ...over,
})

describe('get_thisweek_releases', () => {
  beforeEach(() => vi.clearAllMocks())

  it('passes plain args (no H3 event) and returns slim releases', async () => {
    vi.mocked(getThisWeekVersions).mockResolvedValue([release()] as any)
    const result = await getThisWeekReleases({ projectId: 858 }, ctx) as any

    expect(getThisWeekVersions).toHaveBeenCalledWith({ redmineUrl: 'http://r', headers: { k: 'v' }, projectId: 858 })
    expect(result.count).toBe(1)
    expect(result.releases[0]).toEqual({
      id: 10, name: '8.9.14.1', dueDate: '2026-10-18', workingDay: '16-OCT-2026', ownerTeam: 'Team Invest',
      releaseBranch: 'release/8.9.14', buildSeries: '8.9.14.X', isCustomerBuild: false, nextVersion: '8.9.14.2',
    })
    expect(JSON.stringify(result)).not.toContain('free text')
    expect(result.note).toMatch(/next 7 days/)
  })

  it('flags customer (production) builds', async () => {
    vi.mocked(getThisWeekVersions).mockResolvedValue([release({ buildFor: '[CUSTOMER (PRODUCTION)]' })] as any)
    expect(((await getThisWeekReleases({ projectId: 1 }, ctx)) as any).releases[0].isCustomerBuild).toBe(true)
  })

  it('returns an empty list when nothing releases this week', async () => {
    vi.mocked(getThisWeekVersions).mockResolvedValue([])
    expect(((await getThisWeekReleases({ projectId: 1 }, ctx)) as any).count).toBe(0)
  })

  it('propagates upstream failures', async () => {
    vi.mocked(getThisWeekVersions).mockRejectedValue(new Error('boom'))
    await expect(getThisWeekReleases({ projectId: 1 }, ctx)).rejects.toThrow('boom')
  })

  it('times out instead of hanging', async () => {
    vi.useFakeTimers()
    try {
      vi.mocked(getThisWeekVersions).mockReturnValue(new Promise(() => {}))
      const pending = getThisWeekReleases({ projectId: 1 }, ctx)
      const assertion = expect(pending).rejects.toThrow(/timed out/)
      await vi.advanceTimersByTimeAsync(10_001)
      await assertion
    } finally {
      vi.useRealTimers()
    }
  })

  it('requires a numeric projectId', async () => {
    await expect(getThisWeekReleases({}, ctx)).rejects.toThrow()
    await expect(getThisWeekReleases({ projectId: 'Invest' }, ctx)).rejects.toThrow()
    expect(getThisWeekVersions).not.toHaveBeenCalled()
  })

  it('exposes a tool definition', () => {
    expect(getThisWeekReleasesTool.name).toBe('get_thisweek_releases')
    expect(Object.keys(getThisWeekReleasesTool.inputSchema)).toEqual(['projectId'])
  })
})
