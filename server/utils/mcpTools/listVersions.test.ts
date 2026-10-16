import { describe, expect, it, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { listVersions, listVersionsTool } from './listVersions'
import { getSupportProjects } from '../projectConfig'

vi.mock('axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), request: vi.fn() },
}))
vi.mock('../projectConfig', () => ({ getSupportProjects: vi.fn() }))

const ctx = { redmineUrl: 'http://r', headers: { k: 'v' } }
const ver = (id: number, name: string, status = 'open', projectId = 1) => ({
  id, name, status, due_date: '2026-10-18', description: 'd', sharing: 'none', wiki_page_title: '',
  created_on: '', updated_on: '', project: { id: projectId, name: `P${projectId}` },
})
const ok = (versions: unknown[]) => ({ data: { versions, total_count: versions.length } })

describe('list_versions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSupportProjects).mockReturnValue([{ id: 1, name: 'P1' }, { id: 2, name: 'P2' }])
  })

  it('fetches the given project only and returns slim versions', async () => {
    vi.mocked(axios.get).mockResolvedValue(ok([ver(10, '8.9.15.4')]))
    const result = await listVersions({ projectId: 5 }, ctx) as any

    expect(axios.get).toHaveBeenCalledTimes(1)
    expect(axios.get).toHaveBeenCalledWith('http://r/projects/5/versions.json', expect.objectContaining({ timeout: 10_000 }))
    expect(result.partial).toBe(false)
    expect(result.versions).toEqual([
      { id: 10, name: '8.9.15.4', projectId: 1, projectName: 'P1', status: 'open', dueDate: '2026-10-18' },
    ])
    expect(axios.post).not.toHaveBeenCalled()
    expect(axios.put).not.toHaveBeenCalled()
    expect(axios.delete).not.toHaveBeenCalled()
    expect(axios.request).not.toHaveBeenCalled()
  })

  it('defaults to the configured projects and de-duplicates by id', async () => {
    vi.mocked(axios.get).mockResolvedValue(ok([ver(10, 'a')]))
    const result = await listVersions({}, ctx) as any
    expect(axios.get).toHaveBeenCalledTimes(2)
    expect(result.versions).toHaveLength(1)
  })

  it('requires projectId when no default project list is configured', async () => {
    vi.mocked(getSupportProjects).mockReturnValue([])
    await expect(listVersions({}, ctx)).rejects.toThrow(/projectId is required/)
    expect(axios.get).not.toHaveBeenCalled()
  })

  it('filters by name substring and status', async () => {
    vi.mocked(axios.get).mockResolvedValue(ok([ver(1, '8.9.15.4'), ver(2, '8.9.15.5', 'closed'), ver(3, '7.0.0.1')]))
    expect((await listVersions({ projectId: 1, name: '8.9.15' }, ctx) as any).versions.map((v: any) => v.id)).toEqual([1, 2])
    expect((await listVersions({ projectId: 1, name: '8.9.15', status: 'closed' }, ctx) as any).versions.map((v: any) => v.id)).toEqual([2])
  })

  it('reports partial results when some projects fail', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce(ok([ver(10, 'a')]))
      .mockRejectedValueOnce(new Error('403'))
    const result = await listVersions({}, ctx) as any
    expect(result.partial).toBe(true)
    expect(result.failedScopes).toEqual(['2'])
    expect(result.versions).toHaveLength(1)
  })

  it('errors when every project fails', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('down'))
    await expect(listVersions({}, ctx)).rejects.toThrow(/Failed to fetch versions/)
  })

  it('caps results and reports truncated', async () => {
    vi.mocked(axios.get).mockResolvedValue(ok([ver(1, 'a'), ver(2, 'b'), ver(3, 'c')]))
    const result = await listVersions({ projectId: 1, limit: 2 }, ctx) as any
    expect(result.count).toBe(2)
    expect(result.truncated).toBe(true)
  })

  it('rejects invalid input', async () => {
    await expect(listVersions({ projectId: 'abc' }, ctx)).rejects.toThrow()
    await expect(listVersions({ projectId: -1 }, ctx)).rejects.toThrow()
    await expect(listVersions({ status: 'weird' }, ctx)).rejects.toThrow()
    await expect(listVersions({ name: 'x'.repeat(65) }, ctx)).rejects.toThrow()
  })

  it('tells the model to use it before get_issues_by_version', () => {
    expect(listVersionsTool.name).toBe('list_versions')
    expect(listVersionsTool.description).toMatch(/get_issues_by_version/)
  })
})
