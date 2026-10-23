import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { mcpTools } from './registry'

// Source of every non-test file in this folder, to prove nothing here can write.
const sources = import.meta.glob(['./*.ts', '!./*.test.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>

const EXPECTED = [
  'list_projects', 'list_versions', 'get_issues_by_version',
  'get_issue_graph', 'list_gitlab_branches', 'get_thisweek_releases',
  'get_issue', 'get_gitlab_merge_request', 'get_gitlab_commit', 'search_redmine',
]

describe('MCP tool registry', () => {
  it('registers exactly the ten read-only tools with unique names', () => {
    const names = mcpTools.map(t => t.name)
    expect(new Set(names).size).toBe(names.length)
    expect([...names].sort()).toEqual([...EXPECTED].sort())
  })

  it('gives every tool a description and a valid zod input shape', () => {
    for (const tool of mcpTools) {
      expect(tool.description.length, tool.name).toBeGreaterThan(20)
      expect(() => z.object(tool.inputSchema), tool.name).not.toThrow()
      expect(typeof tool.handler, tool.name).toBe('function')
    }
  })

  it('accepts a representative valid input for each tool schema', () => {
    const samples: Record<string, unknown> = {
      list_projects: { nameContains: 'gate' },
      list_versions: { projectId: 1, name: '8.9' },
      get_issues_by_version: { versionName: '8.9.15.3' },
      get_issue_graph: { issueId: 123, depth: 2 },
      list_gitlab_branches: { nameContains: 'feature' },
      get_thisweek_releases: { projectId: 858 },
      get_issue: { issueId: 380442, includeJournals: true },
      get_gitlab_merge_request: { projectPath: 'invest/invest-net-resource', iid: 619, includeDiff: true },
      get_gitlab_commit: { projectPath: 'invest/invest-net-resource', sha: 'ab12cd3' },
      search_redmine: { q: '7.5.44.1', types: ['issues', 'wiki_pages'], titlesOnly: true },
    }
    for (const tool of mcpTools) {
      expect(z.object(tool.inputSchema).safeParse(samples[tool.name]).success, tool.name).toBe(true)
    }
  })

  it('has no write/delete/mail tool (permanent exclusions and any mutating verb)', () => {
    for (const tool of mcpTools) {
      expect(tool.name, tool.name).not.toMatch(/send|mail|delete|remove|create|update|set_|write|auto_|post|put/)
    }
  })
})

describe('read-only guarantee', () => {
  it('scans the tool sources', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(8)
  })

  it('never uses a non-GET HTTP call in any tool source', () => {
    for (const [file, code] of Object.entries(sources)) {
      expect(code, file).not.toMatch(/axios\.(post|put|patch|delete|request)\b/)
      expect(code, file).not.toMatch(/\.(post|put|patch|delete)\s*\(/)
      expect(code, file).not.toMatch(/method\s*:\s*['"](POST|PUT|PATCH|DELETE)['"]/i)
      expect(code, file).not.toMatch(/\bfetch\s*\(/)
    }
  })
})
