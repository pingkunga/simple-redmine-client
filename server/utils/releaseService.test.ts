import { describe, expect, it, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { getThisWeekVersions } from './releaseService'

vi.mock('axios', () => ({
  default: { get: vi.fn() },
}))

const raw = (id: number, name: string, due_date: string, description = '') => ({
  id, name, description, due_date, status: 'open', sharing: 'none',
  project: { id: 858, name: 'P' }, wiki_page_title: '', created_on: '', updated_on: '',
})

const run = async (versions: unknown[], now: Date) => {
  vi.mocked(axios.get).mockResolvedValue({ data: { versions } })
  return getThisWeekVersions({ redmineUrl: 'http://r', headers: { k: 'v' }, projectId: 858, now })
}

// The service assumes the server runs in the deployment timezone (Asia/Bangkok) or UTC,
// so these cases use local-time `now` values and run in any non-negative-offset zone.
describe('getThisWeekVersions', () => {
  beforeEach(() => vi.clearAllMocks())

  // Fri 2026-10-16; window is 17..23 Oct, the only Sunday is 18 Oct.
  const friday = new Date(2026, 9, 16, 12)

  it('calls Redmine with plain args (no H3 event)', async () => {
    await run([], friday)
    expect(axios.get).toHaveBeenCalledWith('http://r/projects/858/versions.json', { headers: { k: 'v' } })
  })

  it('keeps only Sunday due dates inside the next 7 days', async () => {
    const result = await run([
      raw(1, '8.9.14.1', '2026-10-18'),  // Sunday in window
      raw(2, '8.9.14.2', '2026-10-19'),  // Monday
      raw(3, '8.9.14.3', '2026-10-25'),  // Sunday, outside window
      raw(4, '8.9.14.4', '2026-10-11'),  // Sunday, past
      raw(5, '8.9.14.5', ''),            // no due date
    ], friday)
    expect(result.map(v => v.id)).toEqual([1])
  })

  it('fills release notes with the preceding Friday as working day', async () => {
    const [v] = await run([raw(1, '8.9.14.1', '2026-10-18')], friday)
    expect(v.versionDueDateText).toBe('20261018')
    expect(v.versionDueDateWorkingDayText).toBe('16-OCT-2026')
    expect(v.ownerTeam).toBe('Team Invest')
    expect(v.currentReleaseBranch).toBe('release/8.9.14')
    expect(v.nextWeekReleaseVersion).toBe('8.9.14.2')
  })

  it('treats PROD versions as customer builds', async () => {
    const [v] = await run([raw(1, '8.9.15.3', '2026-10-18', 'PROD')], friday)
    expect(v.buildFor).toBe('[CUSTOMER (PRODUCTION)]')
    expect(v.nextWeekReleaseVersion).toBe('8.9.16.0')
    expect(v.ownerTeam).toBe('Team TM')
  })

  it('rethrows upstream errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(axios.get).mockRejectedValue(new Error('boom'))
    await expect(getThisWeekVersions({ redmineUrl: 'http://r', headers: {}, projectId: 1, now: friday }))
      .rejects.toThrow('boom')
  })
})
