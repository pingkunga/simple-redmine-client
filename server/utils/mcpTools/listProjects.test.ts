import { describe, expect, it, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { listProjects, listProjectsTool } from './listProjects'

vi.mock('axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), request: vi.fn() },
}))

const ctx = { redmineUrl: 'http://r', headers: { k: 'v' } }
const proj = (id: number, name: string, identifier = `p${id}`) => ({ id, name, identifier })
const page = (projects: unknown[], total = projects.length) =>
  ({ data: { projects, total_count: total, offset: 0, limit: 100 } })

describe('list_projects', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns slim projects and only issues GET requests', async () => {
    vi.mocked(axios.get).mockResolvedValue(page([{ ...proj(1, 'Alpha'), description: 'secret text' }]))
    const result = await listProjects({}, ctx)

    expect(result).toEqual({ total: 1, count: 1, truncated: false, projects: [{ id: 1, name: 'Alpha', identifier: 'p1' }] })
    expect(axios.get).toHaveBeenCalledWith('http://r/projects.json', expect.objectContaining({ headers: ctx.headers, timeout: 10_000 }))
    expect(axios.post).not.toHaveBeenCalled()
    expect(axios.put).not.toHaveBeenCalled()
    expect(axios.delete).not.toHaveBeenCalled()
    expect(axios.request).not.toHaveBeenCalled()
  })

  it('filters by name or identifier, case-insensitively', async () => {
    vi.mocked(axios.get).mockResolvedValue(page([proj(1, 'Invest Gateway'), proj(2, 'Sample', 'dotnet')]))
    expect((await listProjects({ nameContains: 'GATEWAY' }, ctx) as any).projects.map((p: any) => p.id)).toEqual([1])
    expect((await listProjects({ nameContains: 'DotNet' }, ctx) as any).projects.map((p: any) => p.id)).toEqual([2])
  })

  it('caps results and reports truncated', async () => {
    vi.mocked(axios.get).mockResolvedValue(page([proj(1, 'A'), proj(2, 'B'), proj(3, 'C')]))
    const result = await listProjects({ limit: 2 }, ctx) as any
    expect(result.count).toBe(2)
    expect(result.truncated).toBe(true)
    expect(result.projects).toHaveLength(2)
  })

  it('follows pagination', async () => {
    vi.mocked(axios.get)
      .mockResolvedValueOnce(page([proj(1, 'A')], 2))
      .mockResolvedValueOnce(page([proj(2, 'B')], 2))
    const result = await listProjects({}, ctx) as any
    expect(result.projects.map((p: any) => p.id)).toEqual([1, 2])
    expect(axios.get).toHaveBeenCalledTimes(2)
  })

  it('errors (not an empty list) when Redmine shows no projects', async () => {
    vi.mocked(axios.get).mockResolvedValue(page([], 0))
    await expect(listProjects({}, ctx)).rejects.toThrow(/no projects/)
  })

  it('propagates upstream failures', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('boom'))
    await expect(listProjects({}, ctx)).rejects.toThrow('boom')
  })

  it('rejects invalid input', async () => {
    await expect(listProjects({ limit: 0 }, ctx)).rejects.toThrow()
    await expect(listProjects({ limit: 201 }, ctx)).rejects.toThrow()
    await expect(listProjects({ nameContains: 'x'.repeat(65) }, ctx)).rejects.toThrow()
  })

  it('exposes a tool definition', () => {
    expect(listProjectsTool.name).toBe('list_projects')
    expect(Object.keys(listProjectsTool.inputSchema)).toEqual(['nameContains', 'limit'])
  })
})
