import { describe, expect, it, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { getIssuesByVersion, getIssuesByVersionTool } from './getIssuesByVersion'

vi.mock('axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), request: vi.fn() },
}))

const ctx = { redmineUrl: 'http://r', headers: { k: 'v' } }
const issue = (id: number) => ({
  id, subject: `S${id}`, description: 'PRIVATE BODY', done_ratio: 50, due_date: '2026-10-20',
  project: { id: 7, name: 'P7' }, tracker: { id: 1, name: 'Defect' },
  status: { id: 1, name: 'New', is_closed: false }, assigned_to: { id: 3, name: 'Alice' },
})
const page = (issues: unknown[], total: number) => ({ data: { issues, total_count: total, offset: 0, limit: 100 } })

describe('get_issues_by_version', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns slim issues without descriptions and only issues GET requests', async () => {
    vi.mocked(axios.get).mockResolvedValue(page([issue(1)], 1))
    const result = await getIssuesByVersion({ versionId: 6032 }, ctx) as any

    expect(axios.get).toHaveBeenCalledWith('http://r/issues.json', expect.objectContaining({
      headers: ctx.headers, timeout: 10_000,
      params: expect.objectContaining({ fixed_version_id: 6032, status_id: '*', offset: 0 }),
    }))
    expect(result).toEqual({
      versionId: 6032, total: 1, count: 1, truncated: false,
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

  it('rejects non-numeric or invalid input', async () => {
    await expect(getIssuesByVersion({ versionId: '8.9.15.4' }, ctx)).rejects.toThrow()
    await expect(getIssuesByVersion({ versionId: 0 }, ctx)).rejects.toThrow()
    await expect(getIssuesByVersion({}, ctx)).rejects.toThrow()
    await expect(getIssuesByVersion({ versionId: 1, limit: 500 }, ctx)).rejects.toThrow()
    expect(axios.get).not.toHaveBeenCalled()
  })

  it('tells the model to resolve names with list_versions first', () => {
    expect(getIssuesByVersionTool.name).toBe('get_issues_by_version')
    expect(getIssuesByVersionTool.description).toMatch(/list_versions/)
  })
})
