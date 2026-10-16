import { describe, expect, it, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { getIssuesByVersion, getIssuesByVersionTool } from './getIssuesByVersion'
import { listVersions } from './listVersions'

vi.mock('axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), request: vi.fn() },
}))
vi.mock('./listVersions', () => ({ listVersions: vi.fn() }))

const ctx = { redmineUrl: 'http://r', headers: { k: 'v' } }
const issue = (id: number) => ({
  id, subject: `S${id}`, description: 'PRIVATE BODY', done_ratio: 50, due_date: '2026-10-20',
  project: { id: 7, name: 'P7' }, tracker: { id: 1, name: 'Defect' },
  status: { id: 1, name: 'New', is_closed: false }, assigned_to: { id: 3, name: 'Alice' },
})
const page = (issues: unknown[], total: number) => ({ data: { issues, total_count: total, offset: 0, limit: 100 } })
const ver = (id: number, name: string, projectId = 1) =>
  ({ id, name, projectId, projectName: `P${projectId}`, status: 'open', dueDate: '2026-10-18' })
const lookup = (versions: unknown[], extra: Record<string, unknown> = {}) =>
  ({ count: versions.length, truncated: false, partial: false, failedScopes: [], versions, ...extra })

describe('get_issues_by_version (by id)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns slim issues without descriptions and only issues GET requests', async () => {
    vi.mocked(axios.get).mockResolvedValue(page([issue(1)], 1))
    const result = await getIssuesByVersion({ versionId: 6032 }, ctx) as any

    expect(listVersions).not.toHaveBeenCalled()
    expect(axios.get).toHaveBeenCalledWith('http://r/issues.json', expect.objectContaining({
      headers: ctx.headers, timeout: 10_000,
      params: expect.objectContaining({ fixed_version_id: 6032, status_id: '*', offset: 0 }),
    }))
    expect(result).toEqual({
      resolved: true, versionId: 6032, version: { id: 6032 }, total: 1, count: 1, truncated: false,
      issues: [{
        id: 1, subject: 'S1', projectId: 7, projectName: 'P7', tracker: 'Defect', status: 'New',
        isClosed: false, assignedTo: 'Alice', dueDate: '2026-10-20', doneRatio: 50,
      }],
    })
    expect(JSON.stringify(result)).not.toContain('PRIVATE BODY')
    expect(axios.post).not.toHaveBeenCalled()
    expect(axios.put).not.toHaveBeenCalled()
    expect(axios.delete).not.toHaveBeenCalled()
    expect(axios.request).not.toHaveBeenCalled()
  })

  it('uses versionId as-is when both id and name are given', async () => {
    vi.mocked(axios.get).mockResolvedValue(page([issue(1)], 1))
    await getIssuesByVersion({ versionId: 6532, versionName: '8.9.15.3' }, ctx)
    expect(listVersions).not.toHaveBeenCalled()
    expect((vi.mocked(axios.get).mock.calls[0]![1] as any).params.fixed_version_id).toBe(6532)
  })

  it('follows pagination using the running offset', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce(page([issue(1), issue(2)], 3))
      .mockResolvedValueOnce(page([issue(3)], 3))
    const result = await getIssuesByVersion({ versionId: 1 }, ctx) as any
    expect(result.issues.map((i: any) => i.id)).toEqual([1, 2, 3])
    expect((vi.mocked(axios.get).mock.calls[1]![1] as any).params.offset).toBe(2)
  })

  it('caps results and reports truncated', async () => {
    vi.mocked(axios.get).mockResolvedValue(page([issue(1), issue(2), issue(3)], 3))
    const result = await getIssuesByVersion({ versionId: 1, limit: 2 }, ctx) as any
    expect(result.count).toBe(2)
    expect(result.total).toBe(3)
    expect(result.truncated).toBe(true)
  })

  it('stops if Redmine returns an empty page (no infinite loop)', async () => {
    vi.mocked(axios.get).mockResolvedValue(page([], 5))
    const result = await getIssuesByVersion({ versionId: 1 }, ctx) as any
    expect(result.count).toBe(0)
    expect(axios.get).toHaveBeenCalledTimes(1)
  })

  it('propagates upstream failures', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('boom'))
    await expect(getIssuesByVersion({ versionId: 1 }, ctx)).rejects.toThrow('boom')
  })

  it('rejects invalid input, including neither id nor name', async () => {
    await expect(getIssuesByVersion({ versionId: '8.9.15.4' }, ctx)).rejects.toThrow()
    await expect(getIssuesByVersion({ versionId: 0 }, ctx)).rejects.toThrow()
    await expect(getIssuesByVersion({}, ctx)).rejects.toThrow(/versionId or versionName/)
    await expect(getIssuesByVersion({ versionName: '   ' }, ctx)).rejects.toThrow()
    await expect(getIssuesByVersion({ versionId: 1, limit: 500 }, ctx)).rejects.toThrow()
    expect(axios.get).not.toHaveBeenCalled()
  })
})

describe('get_issues_by_version (by name)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('resolves an exact name and fetches that version\'s issues', async () => {
    vi.mocked(listVersions).mockResolvedValue(lookup([ver(6532, '8.9.15.3', 37)]))
    vi.mocked(axios.get).mockResolvedValue(page([issue(1)], 1))

    const result = await getIssuesByVersion({ versionName: '8.9.15.3', projectId: 37 }, ctx) as any

    expect(listVersions).toHaveBeenCalledWith({ projectId: 37, name: '8.9.15.3', limit: 200 }, ctx)
    expect((vi.mocked(axios.get).mock.calls[0]![1] as any).params.fixed_version_id).toBe(6532)
    expect(result.resolved).toBe(true)
    expect(result.version).toEqual({ id: 6532, name: '8.9.15.3', projectId: 37 })
    expect(result.issues).toHaveLength(1)
  })

  it('matches names case-insensitively and ignores surrounding spaces', async () => {
    vi.mocked(listVersions).mockResolvedValue(lookup([ver(5, 'Release-A')]))
    vi.mocked(axios.get).mockResolvedValue(page([], 0))
    const result = await getIssuesByVersion({ versionName: '  release-a ' }, ctx) as any
    expect(result.resolved).toBe(true)
    expect(result.versionId).toBe(5)
  })

  it('does not let 8.9.15.3 swallow 8.9.15.30 (exact match wins)', async () => {
    vi.mocked(listVersions).mockResolvedValue(lookup([ver(30, '8.9.15.30'), ver(3, '8.9.15.3')]))
    vi.mocked(axios.get).mockResolvedValue(page([], 0))
    const result = await getIssuesByVersion({ versionName: '8.9.15.3' }, ctx) as any
    expect(result.resolved).toBe(true)
    expect(result.versionId).toBe(3)
  })

  it('returns candidates instead of guessing when the same name exists in two projects', async () => {
    vi.mocked(listVersions).mockResolvedValue(lookup([ver(1, '8.9.15.3', 37), ver(2, '8.9.15.3', 1)]))
    const result = await getIssuesByVersion({ versionName: '8.9.15.3' }, ctx) as any
    expect(result.resolved).toBe(false)
    expect(result.reason).toBe('ambiguous')
    expect(result.candidates.map((c: any) => c.id)).toEqual([1, 2])
    expect(axios.get).not.toHaveBeenCalled()
  })

  it('returns near matches when there is no exact match', async () => {
    vi.mocked(listVersions).mockResolvedValue(lookup([ver(30, '8.9.15.30'), ver(31, '8.9.15.31')]))
    const result = await getIssuesByVersion({ versionName: '8.9.15.3' }, ctx) as any
    expect(result.resolved).toBe(false)
    expect(result.reason).toBe('no_exact_match')
    expect(result.candidates).toHaveLength(2)
    expect(axios.get).not.toHaveBeenCalled()
  })

  it('reports not_found and surfaces partial lookup failures', async () => {
    vi.mocked(listVersions).mockResolvedValue(lookup([], { partial: true, failedScopes: ['37'] }))
    const result = await getIssuesByVersion({ versionName: '9.9.9.9' }, ctx) as any
    expect(result).toMatchObject({ resolved: false, reason: 'not_found', partial: true, failedScopes: ['37'] })
    expect(result.hint).toMatch(/versionId/)
    expect(axios.get).not.toHaveBeenCalled()
  })

  it('limits the candidate list', async () => {
    vi.mocked(listVersions).mockResolvedValue(lookup(Array.from({ length: 15 }, (_, i) => ver(i + 1, `8.9.15.${i + 30}`))))
    const result = await getIssuesByVersion({ versionName: '8.9.15' }, ctx) as any
    expect(result.candidates).toHaveLength(10)
  })

  it('propagates lookup errors (e.g. no default project list configured)', async () => {
    vi.mocked(listVersions).mockRejectedValue(new Error('projectId is required'))
    await expect(getIssuesByVersion({ versionName: '8.9.15.3' }, ctx)).rejects.toThrow('projectId is required')
  })
})

describe('get_issues_by_version tool definition', () => {
  it('tells the model to pass a user-typed id, else the name as written', () => {
    expect(getIssuesByVersionTool.name).toBe('get_issues_by_version')
    expect(Object.keys(getIssuesByVersionTool.inputSchema)).toEqual(['versionId', 'versionName', 'projectId', 'limit'])
    expect(getIssuesByVersionTool.description).toMatch(/id=6532/)
    expect(getIssuesByVersionTool.description).toMatch(/versionName/)
  })
})
