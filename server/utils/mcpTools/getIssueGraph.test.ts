import { describe, expect, it, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { getIssueGraph, getIssueGraphTool } from './getIssueGraph'

vi.mock('axios', () => ({
  default: {
    get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), request: vi.fn(),
    isAxiosError: (e: any) => !!e?.isAxiosError,
  },
}))

const ctx = { redmineUrl: 'http://r', headers: { k: 'v' } }
const raw = (id: number, extra: Record<string, unknown> = {}) => ({
  id, subject: `S${id}`, project: { id: 1, name: 'P1' }, tracker: { id: 1, name: 'Feature' },
  status: { id: 1, name: 'New' }, assigned_to: { id: 1, name: 'Alice' }, ...extra,
})

describe('get_issue_graph', () => {
  beforeEach(() => vi.clearAllMocks())

  it('builds the graph through fetchIssueGraph using GET only', async () => {
    vi.mocked(axios.get).mockImplementation(async (url: string) => {
      if (url.endsWith('/issues/1.json')) {
        return { data: { issue: raw(1, { relations: [{ id: 9, issue_id: 1, issue_to_id: 2, relation_type: 'blocks' }] }) } }
      }
      return { data: { issue: raw(2) } }
    })

    const graph = await getIssueGraph({ issueId: 1 }, ctx) as any

    expect(graph.nodes.map((n: any) => n.id).sort()).toEqual([1, 2])
    expect(graph.edges).toHaveLength(1)
    expect(axios.get).toHaveBeenCalledWith('http://r/issues/1.json', expect.objectContaining({ headers: ctx.headers }))
    expect(axios.post).not.toHaveBeenCalled()
    expect(axios.put).not.toHaveBeenCalled()
    expect(axios.delete).not.toHaveBeenCalled()
    expect(axios.request).not.toHaveBeenCalled()
  })

  it('turns a 404 on the root issue into a clear error', async () => {
    vi.mocked(axios.get).mockRejectedValue({ isAxiosError: true, response: { status: 404 } })
    await expect(getIssueGraph({ issueId: 99 }, ctx)).rejects.toThrow('Issue 99 not found')
  })

  it('propagates other upstream failures', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('boom'))
    await expect(getIssueGraph({ issueId: 1 }, ctx)).rejects.toThrow('boom')
  })

  it('rejects invalid input before calling Redmine', async () => {
    await expect(getIssueGraph({ issueId: 'x' }, ctx)).rejects.toThrow()
    await expect(getIssueGraph({ issueId: 1, depth: 6 }, ctx)).rejects.toThrow()
    await expect(getIssueGraph({ issueId: 1, maxNodes: 201 }, ctx)).rejects.toThrow()
    expect(axios.get).not.toHaveBeenCalled()
  })

  it('exposes a tool definition', () => {
    expect(getIssueGraphTool.name).toBe('get_issue_graph')
    expect(Object.keys(getIssueGraphTool.inputSchema)).toEqual(['issueId', 'depth', 'maxNodes'])
  })
})
