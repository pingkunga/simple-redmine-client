import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getGitlabCommit, getGitlabCommitTool } from './getGitlabCommit'
import { gitlabGet } from './gitlabApi'

vi.mock('./gitlabApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./gitlabApi')>()),
  gitlabGet: vi.fn(),
}))

const commit = {
  id: 'ab12cd3456', short_id: 'ab12cd3', title: 'fix ProveBy', message: 'fix ProveBy\r\n\r\ndetails',
  author_name: 'Dev A', author_email: 'a@x.com', authored_date: 'a', committed_date: 'c', parent_ids: ['p1'],
  web_url: 'http://g/x/-/commit/ab12cd3', stats: { additions: 3, deletions: 1, total: 4 },
}
const file = { old_path: 'a.cs', new_path: 'a.cs', diff: '@@ -1 +1 @@\n-old\n+new' }

const route = (table: Record<string, unknown>) =>
  vi.mocked(gitlabGet).mockImplementation(async (path: string) => {
    const hit = Object.entries(table).find(([suffix]) => path.endsWith(suffix))
    if (!hit) throw new Error(`unexpected GitLab path ${path}`)
    return hit[1] as any
  })

describe('get_gitlab_commit', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns the commit with stats and a file summary, no emails, no diff text by default', async () => {
    route({ '/commits/ab12cd3': commit, '/diff': [file] })
    const result = await getGitlabCommit({ projectPath: 'invest/invest-net-resource', sha: 'ab12cd3' }) as any

    expect(vi.mocked(gitlabGet).mock.calls[0]![0]).toBe('/projects/invest%2Finvest-net-resource/repository/commits/ab12cd3')
    expect(result).toMatchObject({ sha: 'ab12cd3456', title: 'fix ProveBy', message: 'fix ProveBy\n\ndetails', author: 'Dev A', stats: { additions: 3, deletions: 1, total: 4 } })
    expect(result.diff.files).toEqual([{ path: 'a.cs', status: 'modified', additions: 1, deletions: 1 }])
    expect(result).not.toHaveProperty('mergeRequests')
    expect(JSON.stringify(result)).not.toContain('a@x.com')
  })

  it('returns diff text when asked and merge requests when asked', async () => {
    route({
      '/commits/ab12cd3': commit, '/diff': [file],
      '/merge_requests': [{ iid: 619, title: 'MR', state: 'merged', web_url: 'u' }],
    })
    const result = await getGitlabCommit({ projectId: 5, sha: 'ab12cd3', includeDiff: true, includeMergeRequests: true }) as any
    expect(result.diff.files[0].diff).toContain('+new')
    expect(result.mergeRequests).toEqual([{ iid: 619, title: 'MR', state: 'merged', webUrl: 'u' }])
  })

  it('rejects a bad sha or a missing project without calling GitLab', async () => {
    await expect(getGitlabCommit({ projectId: 5, sha: 'main' })).rejects.toThrow()
    await expect(getGitlabCommit({ projectId: 5, sha: '../x' })).rejects.toThrow()
    await expect(getGitlabCommit({ sha: 'ab12cd3' })).rejects.toThrow(/projectId or projectPath/)
    expect(gitlabGet).not.toHaveBeenCalled()
  })

  it('exposes a tool definition', () => {
    expect(getGitlabCommitTool.name).toBe('get_gitlab_commit')
  })
})
