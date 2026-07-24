import { describe, expect, it, vi, beforeEach } from 'vitest'
import axios from 'axios'
import { clampGraphOptions, fetchIssueGraph } from './issueGraph'

vi.mock('axios', () => ({
  default: { get: vi.fn() },
}))

const baseIssue = (overrides: Partial<RawIssue> & { id: number; subject: string }): RawIssue => ({
  project: { id: 1, name: 'P1' },
  tracker: { id: 1, name: 'Feature' },
  status: { id: 1, name: 'New', is_closed: false },
  priority: { id: 1, name: 'Normal' },
  author: { id: 1, name: 'Alice' },
  assigned_to: { id: 1, name: 'Alice' },
  category: { id: 1, name: 'C' },
  fixed_version: { id: 1, name: 'V1' },
  subject: '',
  description: '',
  due_date: '',
  done_ratio: 0,
  is_private: false,
  custom_fields: [],
  created_on: '',
  updated_on: '',
  ...overrides,
})

// Graph: 100 -relates-> 200 ; 300 -blocks-> 100 ; 100 has child 400 ; 300 -duplicates-> 500
const db: Record<number, RawIssue> = {
  100: baseIssue({
    id: 100,
    subject: 'Root',
    relations: [
      { id: 1, issue_id: 100, issue_to_id: 200, relation_type: 'relates' },
      { id: 2, issue_id: 300, issue_to_id: 100, relation_type: 'blocks' },
    ],
    children: [{ id: 400, tracker: { id: 1, name: 'Feature' }, subject: 'Child', status: { id: 1, name: 'New' } }],
  }),
  200: baseIssue({
    id: 200,
    subject: 'Related',
    relations: [{ id: 1, issue_id: 100, issue_to_id: 200, relation_type: 'relates' }],
  }),
  300: baseIssue({
    id: 300,
    subject: 'Blocker',
    relations: [
      { id: 2, issue_id: 300, issue_to_id: 100, relation_type: 'blocks' },
      { id: 3, issue_id: 300, issue_to_id: 500, relation_type: 'duplicates' },
    ],
  }),
  400: baseIssue({ id: 400, subject: 'Child' }),
  500: baseIssue({ id: 500, subject: 'Duplicate target' }),
}

const params = (overrides: Partial<{ depth: number; maxNodes: number; timeoutMs: number }> = {}) => ({
  redmineUrl: 'https://redmine.example.com',
  headers: { 'X-Redmine-API-Key': 'token' },
  depth: 2,
  maxNodes: 50,
  timeoutMs: 5000,
  ...overrides,
})

describe('fetchIssueGraph', () => {
  beforeEach(() => {
    vi.mocked(axios.get).mockImplementation(async (url: string) => {
      const match = /issues\/(\d+)\.json/.exec(url)
      const id = Number(match?.[1])
      const issue = db[id]
      if (!issue) {
        const error: any = new Error('Not Found')
        error.isAxiosError = true
        error.response = { status: 404 }
        throw error
      }
      return { data: { issue } }
    })
  })

  it('stops at the requested depth and flags the cut-off node without dangling edges', async () => {
    const result = await fetchIssueGraph(100, params({ depth: 1 }))

    expect(result.nodes.map(n => n.id).sort()).toEqual([100, 200, 300, 400])
    expect(result.edges.map(e => e.id).sort()).toEqual(['parent-100-400', 'relation-1', 'relation-2'])

    const blocker = result.nodes.find(n => n.id === 300)!
    expect(blocker.hasMoreRelations).toBe(true)
    expect(result.truncated).toBe(true)
    expect(result.truncatedReason).toBe('depth')
  })

  it('fully traverses when depth allows and is not marked truncated', async () => {
    const result = await fetchIssueGraph(100, params({ depth: 2 }))

    expect(result.nodes.map(n => n.id).sort()).toEqual([100, 200, 300, 400, 500])
    expect(result.edges.map(e => e.id).sort()).toEqual(['parent-100-400', 'relation-1', 'relation-2', 'relation-3'])
    expect(result.truncated).toBe(false)
    expect(result.truncatedReason).toBeUndefined()
  })

  it('dedupes a symmetric relation into a single edge', async () => {
    const result = await fetchIssueGraph(100, params({ depth: 1 }))
    expect(result.edges.filter(e => e.id === 'relation-1')).toHaveLength(1)
  })

  it('caps traversal at maxNodes without leaving dangling edges', async () => {
    const result = await fetchIssueGraph(100, params({ depth: 2, maxNodes: 2 }))

    expect(result.nodes.map(n => n.id).sort()).toEqual([100, 200])
    // Edges must only reference nodes actually present in the response.
    const nodeIds = new Set(result.nodes.map(n => n.id))
    for (const edge of result.edges) {
      expect(nodeIds.has(edge.source)).toBe(true)
      expect(nodeIds.has(edge.target)).toBe(true)
    }

    const root = result.nodes.find(n => n.id === 100)!
    expect(root.hasMoreRelations).toBe(true)
    expect(result.truncated).toBe(true)
    expect(result.truncatedReason).toBe('maxNodes')
  })

  it('rethrows when the root issue itself cannot be fetched', async () => {
    await expect(fetchIssueGraph(9999, params())).rejects.toThrow()
  })

  it('skips (does not fail) a neighbor that 404s mid-traversal', async () => {
    vi.mocked(axios.get).mockImplementation(async (url: string) => {
      const match = /issues\/(\d+)\.json/.exec(url)
      const id = Number(match?.[1])
      if (id === 200) {
        const error: any = new Error('Not Found')
        error.isAxiosError = true
        error.response = { status: 404 }
        throw error
      }
      const issue = db[id]
      return { data: { issue } }
    })

    const result = await fetchIssueGraph(100, params({ depth: 1 }))
    expect(result.nodes.map(n => n.id).sort()).toEqual([100, 300, 400])
  })
})

describe('clampGraphOptions', () => {
  it('applies defaults when nothing is provided', () => {
    expect(clampGraphOptions({})).toEqual({ depth: 2, maxNodes: 50, timeoutMs: 5000 })
  })

  it('clamps values above the hard ceiling', () => {
    expect(clampGraphOptions({ depth: 999, maxNodes: 999999, timeoutMs: 999999 })).toEqual({
      depth: 5,
      maxNodes: 200,
      timeoutMs: 30000,
    })
  })

  it('clamps values below the minimum', () => {
    expect(clampGraphOptions({ depth: 0, maxNodes: -5, timeoutMs: 0 })).toEqual({
      depth: 1,
      maxNodes: 1,
      timeoutMs: 1,
    })
  })
})
