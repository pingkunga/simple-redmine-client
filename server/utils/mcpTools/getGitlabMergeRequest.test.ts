import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getGitlabMergeRequest, getGitlabMergeRequestTool } from './getGitlabMergeRequest'
import { gitlabGet } from './gitlabApi'

vi.mock('./gitlabApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./gitlabApi')>()),
  gitlabGet: vi.fn(),
}))

const mr = {
  iid: 619, title: 'Add ProveBy', state: 'merged', draft: false, description: 'Why\r\nbecause',
  source_branch: 'feature/prove', target_branch: 'release/8.9.8', author: { name: 'Dev A', email: 'a@x.com' },
  merged_by: { name: 'Dev B' }, created_at: 'c', merged_at: 'm', web_url: 'http://g/invest/invest-net-resource/-/merge_requests/619',
  changes_count: '2',
}
const file = (over: Record<string, unknown> = {}) => ({
  old_path: 'a.cs', new_path: 'a.cs', diff: '@@ -1,2 +1,2 @@\n-old\n+new\n+more\n keep', ...over,
})

// Route each GitLab path to a canned response.
const route = (table: Record<string, unknown>) =>
  vi.mocked(gitlabGet).mockImplementation(async (path: string) => {
    const hit = Object.entries(table).find(([suffix]) => path.endsWith(suffix))
    if (!hit) throw new Error(`unexpected GitLab path ${path}`)
    return hit[1] as any
  })

describe('get_gitlab_merge_request', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns MR facts and a diff summary with line counts, no diff text, no emails', async () => {
    route({ '/merge_requests/619': mr, '/diffs': [file(), file({ new_path: 'b.cs', old_path: 'b.cs', new_file: true })] })
    const result = await getGitlabMergeRequest({ projectPath: 'invest/invest-net-resource', iid: 619 }) as any

    expect(vi.mocked(gitlabGet).mock.calls[0]![0]).toBe('/projects/invest%2Finvest-net-resource/merge_requests/619')
    expect(result).toMatchObject({ iid: 619, title: 'Add ProveBy', state: 'merged', sourceBranch: 'feature/prove', targetBranch: 'release/8.9.8', author: 'Dev A', mergedBy: 'Dev B', description: 'Why\nbecause' })
    expect(result).not.toHaveProperty('commits')
    expect(result.diff.files[0]).toEqual({ path: 'a.cs', status: 'modified', additions: 2, deletions: 1 })
    expect(result.diff.files[1].status).toBe('added')
    expect(JSON.stringify(result)).not.toContain('a@x.com')
    expect(JSON.stringify(result)).not.toContain('"diff":"@@')
  })

  it('returns commits only when asked, without author emails', async () => {
    route({
      '/merge_requests/619': mr, '/diffs': [],
      '/commits': [{ id: 'abc1234567', short_id: 'abc1234', title: 'fix', author_name: 'Dev A', author_email: 'a@x.com', committed_date: 'd', web_url: 'u' }],
    })
    const result = await getGitlabMergeRequest({ projectId: 5, iid: 619, includeCommits: true }) as any
    expect(result.commitCount).toBe(1)
    expect(result.commits[0]).toEqual({ sha: 'abc1234567', shortId: 'abc1234', title: 'fix', author: 'Dev A', committedDate: 'd', webUrl: 'u' })
    expect(JSON.stringify(result)).not.toContain('a@x.com')
  })

  it('includes diff text only when asked, skips withheld / generated files, honours the budget', async () => {
    route({
      '/merge_requests/619': mr,
      '/diffs': [file(), file({ new_path: 'big.cs', diff: '', too_large: true }), file({ new_path: 'g.cs', generated_file: true }), file({ new_path: 'c.cs', diff: 'x'.repeat(2000) })],
    })
    const result = await getGitlabMergeRequest({ projectId: 5, iid: 619, includeDiff: true, maxDiffChars: 600 }) as any
    const [a, big, gen, c] = result.diff.files
    expect(a.diff).toContain('+new')
    expect(big).toMatchObject({ tooLarge: true }); expect(big).not.toHaveProperty('diff')
    expect(gen).toMatchObject({ generated: true }); expect(gen).not.toHaveProperty('diff')
    expect(c.diff.length).toBeLessThan(600)
    expect(result.diff.diffTruncated).toBe(true)
  })

  it('caps the number of files listed', async () => {
    route({ '/merge_requests/619': mr, '/diffs': Array.from({ length: 5 }, (_, i) => file({ new_path: `f${i}.cs` })) })
    const result = await getGitlabMergeRequest({ projectId: 5, iid: 619, maxFiles: 2 }) as any
    expect(result.diff.fileCount).toBe(5)
    expect(result.diff.files).toHaveLength(2)
    expect(result.diff.filesTruncated).toBe(true)
  })

  it('rejects bad input without calling GitLab', async () => {
    await expect(getGitlabMergeRequest({ iid: 619 })).rejects.toThrow(/projectId or projectPath/)
    await expect(getGitlabMergeRequest({ projectId: 5, iid: 0 })).rejects.toThrow()
    await expect(getGitlabMergeRequest({ projectPath: '../etc', iid: 1 })).rejects.toThrow()
    expect(gitlabGet).not.toHaveBeenCalled()
  })

  it('exposes a tool definition', () => {
    expect(getGitlabMergeRequestTool.name).toBe('get_gitlab_merge_request')
  })
})
