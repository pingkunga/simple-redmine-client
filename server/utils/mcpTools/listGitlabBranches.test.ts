import { describe, expect, it, vi, beforeEach } from 'vitest'
import { listGitlabBranches, listGitlabBranchesTool } from './listGitlabBranches'
import { getGitLabBranches } from '../gitlabCache'
import { getSupportGitLabProjects } from '../projectConfig'

vi.mock('../gitlabCache', () => ({ getGitLabBranches: vi.fn() }))
vi.mock('../projectConfig', () => ({ getSupportGitLabProjects: vi.fn() }))

const ctx = { redmineUrl: 'http://r', headers: {} }
const branch = (name: string, creator: string, createdAt: string, extra: Record<string, unknown> = {}) => ({
  name, creator_name: creator, created_at: createdAt, default: false, protected: false, merged: false,
  web_url: 'u', commit: {
    id: 'x', short_id: 'x', title: 'SECRET TITLE', message: 'SECRET MESSAGE', author_name: 'a',
    author_email: 'secret@example.com', authored_date: createdAt, committer_name: 'c', committer_email: 'c@x',
    committed_date: '2026-10-01T00:00:00Z', web_url: 'w',
  },
  ...extra,
})

const CONFIG = [{ id: 37, name: 'Invest Gateway' }, { id: 1, name: 'Sample DOTNET' }]

describe('list_gitlab_branches', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(getSupportGitLabProjects).mockReturnValue(CONFIG)
  })

  it('searches every configured project when no project is given, tags each branch, newest first', async () => {
    vi.mocked(getGitLabBranches).mockImplementation(async (id: string) =>
      id === '37'
        ? [branch('feature/login', 'Alice', '2026-09-01T00:00:00Z', { default: true })]
        : [branch('feature/report', 'Bob', '2026-10-01T00:00:00Z')] as any)

    const result = await listGitlabBranches({}, ctx) as any

    expect(getGitLabBranches).toHaveBeenCalledTimes(2)
    expect(result.resolved).toBe(true)
    expect(result.partial).toBe(false)
    expect(result.branches.map((b: any) => b.name)).toEqual(['feature/report', 'feature/login'])
    expect(result.branches[0]).toEqual({
      projectId: 1, projectName: 'Sample DOTNET', name: 'feature/report', creatorName: 'Bob',
      createdAt: '2026-10-01T00:00:00Z', isDefault: false, isProtected: false, isMerged: false,
      lastCommitDate: '2026-10-01T00:00:00Z',
    })
  })

  it('does not return commit titles, messages or author emails', async () => {
    vi.mocked(getGitLabBranches).mockResolvedValue([branch('a', 'Alice', '2026-09-01T00:00:00Z')] as any)
    const json = JSON.stringify(await listGitlabBranches({}, ctx))
    expect(json).not.toContain('SECRET')
  })

  it('finds a branch by name across projects (the "who created this branch" question)', async () => {
    vi.mocked(getGitLabBranches).mockImplementation(async (id: string) =>
      id === '37' ? [branch('feature/login', 'Alice', '2026-09-01T00:00:00Z'), branch('main', 'x', '2026-01-01T00:00:00Z')] as any
                  : [branch('hotfix/login-bug', 'Bob', '2026-10-02T00:00:00Z')] as any)
    const result = await listGitlabBranches({ nameContains: 'LOGIN' }, ctx) as any
    expect(result.branches.map((b: any) => [b.projectId, b.name, b.creatorName])).toEqual([
      [1, 'hotfix/login-bug', 'Bob'],
      [37, 'feature/login', 'Alice'],
    ])
  })

  it('resolves projectName against the configured list', async () => {
    vi.mocked(getGitLabBranches).mockResolvedValue([] as any)
    const result = await listGitlabBranches({ projectName: 'GATEWAY' }, ctx) as any
    expect(getGitLabBranches).toHaveBeenCalledTimes(1)
    expect(getGitLabBranches).toHaveBeenCalledWith('37')
    expect(result.searchedProjects).toEqual([{ id: 37, name: 'Invest Gateway' }])
  })

  it('returns candidates when the project name matches nothing', async () => {
    const result = await listGitlabBranches({ projectName: 'nope' }, ctx) as any
    expect(result).toMatchObject({ resolved: false, reason: 'project_not_found', candidates: CONFIG })
    expect(getGitLabBranches).not.toHaveBeenCalled()
  })

  it('uses an explicit projectId even if it is not in the configured list', async () => {
    vi.mocked(getGitLabBranches).mockResolvedValue([branch('x', 'A', '2026-01-01T00:00:00Z')] as any)
    const result = await listGitlabBranches({ projectId: 999 }, ctx) as any
    expect(getGitLabBranches).toHaveBeenCalledWith('999')
    expect(result.branches[0].projectId).toBe(999)
  })

  it('reports partial results when one project fails', async () => {
    vi.mocked(getGitLabBranches).mockImplementation(async (id: string) => {
      if (id === '1') throw new Error('403')
      return [branch('ok', 'A', '2026-01-01T00:00:00Z')] as any
    })
    const result = await listGitlabBranches({}, ctx) as any
    expect(result.partial).toBe(true)
    expect(result.failedScopes).toEqual(['1'])
    expect(result.branches).toHaveLength(1)
  })

  it('errors when every project fails', async () => {
    vi.mocked(getGitLabBranches).mockRejectedValue(new Error('down'))
    await expect(listGitlabBranches({}, ctx)).rejects.toThrow(/Failed to fetch GitLab branches/)
  })

  it('errors when nothing is configured and no projectId is given', async () => {
    vi.mocked(getSupportGitLabProjects).mockReturnValue([])
    await expect(listGitlabBranches({}, ctx)).rejects.toThrow(/projectId is required/)
    expect(getGitLabBranches).not.toHaveBeenCalled()
  })

  it('caps results and reports truncated', async () => {
    vi.mocked(getGitLabBranches).mockResolvedValue(
      [branch('a', 'A', '2026-03-01T00:00:00Z'), branch('b', 'B', '2026-02-01T00:00:00Z'), branch('c', 'C', '2026-01-01T00:00:00Z')] as any)
    const result = await listGitlabBranches({ projectId: 37, limit: 2 }, ctx) as any
    expect(result.count).toBe(2)
    expect(result.truncated).toBe(true)
  })

  it('rejects invalid input before calling GitLab', async () => {
    await expect(listGitlabBranches({ projectId: 'abc' }, ctx)).rejects.toThrow()
    await expect(listGitlabBranches({ projectId: '37/../../x' }, ctx)).rejects.toThrow()
    await expect(listGitlabBranches({ projectId: -1 }, ctx)).rejects.toThrow()
    await expect(listGitlabBranches({ limit: 201 }, ctx)).rejects.toThrow()
    expect(getGitLabBranches).not.toHaveBeenCalled()
  })

  it('tells the model to omit the project when the user did not name one', () => {
    expect(listGitlabBranchesTool.name).toBe('list_gitlab_branches')
    expect(listGitlabBranchesTool.description).toMatch(/OMIT projectId/)
  })
})
