import { describe, it, expect } from 'vitest'
import useIssueGraph from './useIssueGraph'

const sampleNode = (overrides: Partial<IssueGraphNode> = {}): IssueGraphNode => ({
  id: 100,
  subject: 'Root issue',
  trackerId: 1,
  trackerName: 'Feature',
  statusId: 1,
  statusName: 'New',
  projectId: 1,
  projectName: 'P1',
  isRoot: false,
  hasMoreRelations: false,
  ...overrides,
})

const sampleEdge = (overrides: Partial<IssueGraphEdge> = {}): IssueGraphEdge => ({
  id: 'relation-1',
  source: 100,
  target: 200,
  type: 'relates',
  label: 'relates to',
  ...overrides,
})

describe('useIssueGraph', () => {
  const { toVueFlowElements, relationEdgeStyle, mergeGraphResponse } = useIssueGraph()

  it('maps issue graph nodes/edges into Vue Flow elements with string ids', () => {
    const { nodes, edges } = toVueFlowElements([sampleNode()], [sampleEdge()])

    expect(nodes).toHaveLength(1)
    expect(nodes[0].id).toBe('100')
    expect(nodes[0].type).toBe('issue')
    expect(nodes[0].data.issue.id).toBe(100)

    expect(edges).toHaveLength(1)
    expect(edges[0].id).toBe('relation-1')
    expect(edges[0].source).toBe('100')
    expect(edges[0].target).toBe('200')
    expect(edges[0].label).toBe('relates to')
  })

  it('returns a distinct style per relation type and falls back to relates for unknown types', () => {
    const blocks = relationEdgeStyle('blocks')
    const relates = relationEdgeStyle('relates')
    const unknown = relationEdgeStyle('does-not-exist' as any)

    expect(blocks).not.toEqual(relates)
    expect(unknown).toEqual(relates)
  })

  it('merges new nodes/edges into an existing graph without duplicating ids', () => {
    const existing = toVueFlowElements([sampleNode({ id: 100 })], [])
    const incoming: IssueGraphResponse = {
      nodes: [sampleNode({ id: 100, hasMoreRelations: false }), sampleNode({ id: 200, subject: 'Related' })],
      edges: [sampleEdge()],
      truncated: false,
    }

    const merged = mergeGraphResponse(existing, incoming)

    expect(merged.nodes.map(n => n.id).sort()).toEqual(['100', '200'])
    expect(merged.edges.map(e => e.id)).toEqual(['relation-1'])
  })

  it('does not duplicate edges already present when merging', () => {
    const existing = toVueFlowElements(
      [sampleNode({ id: 100 }), sampleNode({ id: 200 })],
      [sampleEdge()]
    )
    const incoming: IssueGraphResponse = {
      nodes: [sampleNode({ id: 100 }), sampleNode({ id: 200 })],
      edges: [sampleEdge()],
      truncated: false,
    }

    const merged = mergeGraphResponse(existing, incoming)
    expect(merged.edges).toHaveLength(1)
  })
})
