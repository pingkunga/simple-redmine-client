import { describe, expect, it, vi, beforeEach } from 'vitest'
import { getIssuesByVersionRange, getIssuesByVersionRangeTool } from './getIssuesByVersionRange'
import { getIssuesByVersion } from './getIssuesByVersion'
import { listVersions } from './listVersions'

vi.mock('./listVersions', () => ({ listVersions: vi.fn() }))
vi.mock('./getIssuesByVersion', () => ({ getIssuesByVersion: vi.fn() }))

const ctx = { redmineUrl: 'http://r', headers: { k: 'v' } }
let nextId = 1
const ver = (name: string, id = nextId++) => ({ id, name, projectId: 858, projectName: 'P', status: 'closed', dueDate: null })
const lookup = (versions: unknown[], extra: Record<string, unknown> = {}) =>
  ({ count: versions.length, truncated: false, partial: false, failedScopes: [], versions, ...extra })

// Serves list_versions from a fixed catalogue using the same substring rule as the real tool.
const catalogue = (names: string[]) => {
  const all = names.map(n => ver(n))
  vi.mocked(listVersions).mockImplementation(async (args: any) =>
    lookup(all.filter(v => v.name.toLowerCase().includes(String(args.name).toLowerCase()))))
  return all
}
const issuesOf = (id: number) => ({
  resolved: true, total: 1, truncated: false,
  issues: [{ id: id * 10, subject: `S${id}`, tracker: 'Defect', status: 'New', assignedTo: 'Alice', dueDate: 'x', doneRatio: 5, projectId: 1 }],
})

describe('get_issues_by_version_range', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    nextId = 1
    vi.mocked(getIssuesByVersion).mockImplementation(async (args: any) => issuesOf(args.versionId))
  })

  it('walks versions across series in numeric order and only inside the range', async () => {
    catalogue(['8.9.9.3', '8.9.15.1', '8.9.14.0', '8.9.14.1', '8.9.14.3', '8.9.16.0', '8.9.15.0', '8.9.16.2'])
    const result = await getIssuesByVersionRange({ from: '8.9.14.1', to: '8.9.16.0' }, ctx) as any
    expect(result.resolved).toBe(true)
    expect(result.versions.map((v: any) => v.name)).toEqual(['8.9.14.1', '8.9.14.3', '8.9.15.0', '8.9.15.1', '8.9.16.0'])
    expect(listVersions).toHaveBeenCalledTimes(3)
    expect(listVersions).toHaveBeenCalledWith({ projectId: undefined, name: '8.9.14.', limit: 200 }, ctx)
  })

  it('compares parts as numbers (8.9.9.x before 8.9.15.x) and ignores look-alike names', async () => {
    catalogue(['8.9.9.1', '8.9.15.1', '8.8.9.1', 'FIT-WMG (WEB) 1.8.9.1', '18.9.9.1'])
    const result = await getIssuesByVersionRange({ from: '8.9.9.0', to: '8.9.15.3' }, ctx) as any
    expect(result.versions.map((v: any) => v.name)).toEqual(['8.9.9.1', '8.9.15.1'])
  })

  it('does not fetch hotfix-style names (3-4 digit or x last part) and only reports them', async () => {
    catalogue(['8.9.14.1', '8.9.14.101', '8.9.14.0001', '8.9.14.008', '8.9.14.x', '8.9.14.2'])
    const result = await getIssuesByVersionRange({ from: '8.9.14.0', to: '8.9.14.x' }, ctx) as any
    expect(result.versions.map((v: any) => v.name)).toEqual(['8.9.14.1', '8.9.14.2'])
    expect(result.skippedHotfixVersions.count).toBe(4)
    expect(result.skippedHotfixVersions.names).toEqual(expect.arrayContaining(['8.9.14.101', '8.9.14.0001', '8.9.14.008', '8.9.14.x']))
    expect(getIssuesByVersion).toHaveBeenCalledTimes(2)
  })

  it('treats ".x" and a 3-part end as the whole end series, and a 3-part start as .0', async () => {
    catalogue(['8.9.20.0', '8.9.20.6', '8.9.21.0'])
    for (const to of ['8.9.20.x', '8.9.20']) {
      const result = await getIssuesByVersionRange({ from: '8.9.20', to }, ctx) as any
      expect(result.versions.map((v: any) => v.name)).toEqual(['8.9.20.0', '8.9.20.6'])
    }
  })

  it('returns slim issues (no assignee, dates or project fields) with the impact note', async () => {
    catalogue(['8.9.20.0'])
    vi.mocked(getIssuesByVersion).mockResolvedValue({
      total: 1, truncated: false,
      issues: [{ id: 1, subject: 'S', tracker: 'Defect', status: 'New', assignedTo: 'Alice', impactNote: 'run migration', impactNoteTruncated: true }],
    })
    const result = await getIssuesByVersionRange({ from: '8.9.20.0', to: '8.9.20.0' }, ctx) as any
    expect(result.versions[0].issues).toEqual([{ id: 1, subject: 'S', tracker: 'Defect', status: 'New', impactNote: 'run migration' }])
  })

  it('fetches at most 50 versions per call and offers the rest as the next batch', async () => {
    catalogue(Array.from({ length: 60 }, (_, i) => `8.9.${10 + Math.floor(i / 6)}.${i % 6}`))
    const result = await getIssuesByVersionRange({ from: '8.9.10.0', to: '8.9.19.x' }, ctx) as any
    expect(result).toMatchObject({ resolved: true, totalVersions: 60, versionCount: 50, offset: 0, hasMore: true, nextOffset: 50 })
    expect(getIssuesByVersion).toHaveBeenCalledTimes(50)
    expect(result.remainingVersions).toEqual({ '8.9.18': expect.any(Array), '8.9.19': expect.any(Array) })
    expect(Object.values(result.remainingVersions).flat()).toHaveLength(10)
  })

  it('reads the next batch with the user-chosen limit and offset, in numeric order', async () => {
    catalogue(Array.from({ length: 30 }, (_, i) => `8.9.${10 + Math.floor(i / 3)}.${i % 3}`))
    const result = await getIssuesByVersionRange({ from: '8.9.10.0', to: '8.9.19.x', limit: 10, offset: 10 }, ctx) as any
    expect(result.versions.map((v: any) => v.name)).toEqual([
      '8.9.13.1', '8.9.13.2', '8.9.14.0', '8.9.14.1', '8.9.14.2', '8.9.15.0', '8.9.15.1', '8.9.15.2', '8.9.16.0', '8.9.16.1',
    ])
    expect(result).toMatchObject({ totalVersions: 30, versionCount: 10, offset: 10, hasMore: true, nextOffset: 20 })
  })

  it('reports no more batches on the last page and for an offset past the end', async () => {
    catalogue(['8.9.20.0', '8.9.20.1', '8.9.20.2'])
    const last = await getIssuesByVersionRange({ from: '8.9.20.0', to: '8.9.20.x', limit: 2, offset: 2 }, ctx) as any
    expect(last).toMatchObject({ versionCount: 1, hasMore: false })
    expect('nextOffset' in last).toBe(false)
    const past = await getIssuesByVersionRange({ from: '8.9.20.0', to: '8.9.20.x', offset: 10 }, ctx) as any
    expect(past).toMatchObject({ resolved: true, versionCount: 0, hasMore: false, versions: [] })
  })

  it('reports partial results when a series lookup or a version fetch fails', async () => {
    const all = catalogue(['8.9.14.0', '8.9.15.0', '8.9.15.1'])
    vi.mocked(listVersions).mockImplementation(async (args: any) => {
      if (String(args.name) === '8.9.14.') throw new Error('boom')
      return lookup(all.filter(v => v.name.includes(String(args.name))), { failedScopes: ['296'], partial: true })
    })
    vi.mocked(getIssuesByVersion).mockImplementation(async (args: any) => {
      if (args.versionId === all[2]!.id) throw new Error('boom')
      return issuesOf(args.versionId)
    })
    const result = await getIssuesByVersionRange({ from: '8.9.14.0', to: '8.9.15.x' }, ctx) as any
    expect(result.partial).toBe(true)
    expect(result.failedScopes).toEqual(expect.arrayContaining(['series 8.9.14', '296']))
    expect(result.failedVersions).toEqual(['8.9.15.1'])
    expect(result.versions.map((v: any) => v.name)).toEqual(['8.9.15.0', '8.9.15.1'])
  })

  it('flags a truncated lookup as partial', async () => {
    vi.mocked(listVersions).mockResolvedValue(lookup([ver('8.9.20.0')], { truncated: true }) as any)
    const result = await getIssuesByVersionRange({ from: '8.9.20.0', to: '8.9.20.x' }, ctx) as any
    expect(result.partial).toBe(true)
  })

  it('rejects bad input without calling Redmine', async () => {
    await expect(getIssuesByVersionRange({ from: 'abc', to: '8.9.1.0' }, ctx)).rejects.toThrow(/Invalid version/)
    await expect(getIssuesByVersionRange({ from: '8.9.14.1', to: '8.9.14.0' }, ctx)).rejects.toThrow(/later/)
    await expect(getIssuesByVersionRange({ from: '8.9.1.0', to: '7.5.4.0' }, ctx)).rejects.toThrow(/same A.B/)
    await expect(getIssuesByVersionRange({ from: '8.9.1.0' }, ctx)).rejects.toThrow()
    for (const bad of [{ limit: 0 }, { limit: 51 }, { offset: -1 }]) {
      await expect(getIssuesByVersionRange({ from: '8.9.1.0', to: '8.9.1.x', ...bad }, ctx)).rejects.toThrow()
    }
    await expect(getIssuesByVersionRange({ from: '8.9.0.0', to: '8.9.99.0' }, ctx)).rejects.toThrow(/more than 40 series/)
    expect(listVersions).not.toHaveBeenCalled()
  })

  it('exposes a read-only tool definition', () => {
    expect(getIssuesByVersionRangeTool.name).toBe('get_issues_by_version_range')
    expect(Object.keys(getIssuesByVersionRangeTool.inputSchema)).toEqual(['from', 'to', 'projectId', 'limit', 'offset'])
  })
})
