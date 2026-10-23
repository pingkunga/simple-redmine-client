import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listGitlabWikiPages } from './listGitlabWikiPages'
import { gitlabGet } from './gitlabApi'

vi.mock('./gitlabApi', async importOriginal => ({
  ...(await importOriginal<typeof import('./gitlabApi')>()),
  gitlabGet: vi.fn(),
}))

const rows = [
  { slug: 'home', title: 'home', format: 'markdown' },
  { slug: 'How-to-create-non-db-unit-test-(Service)', title: 'How to create non db unit test (Service)', format: 'markdown' },
  { slug: 'dev/Setup', title: 'dev/Setup', format: 'markdown' },
]

describe('list_gitlab_wiki_pages', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists the wiki of a project path and maps the fields', async () => {
    vi.mocked(gitlabGet).mockResolvedValue(rows)
    const out = await listGitlabWikiPages({ projectPath: 'invest/invest-service' }) as any
    expect(vi.mocked(gitlabGet).mock.calls[0]![0]).toBe('/projects/invest%2Finvest-service/wikis')
    expect(out).toMatchObject({ total: 3, count: 3, truncated: false })
    expect(out.pages[0]).toEqual({ slug: 'home', title: 'home', format: 'markdown' })
  })

  it('accepts a numeric project id', async () => {
    vi.mocked(gitlabGet).mockResolvedValue([])
    await listGitlabWikiPages({ projectId: 12 })
    expect(vi.mocked(gitlabGet).mock.calls[0]![0]).toBe('/projects/12/wikis')
  })

  it('filters by title or slug, case-insensitively', async () => {
    vi.mocked(gitlabGet).mockResolvedValue(rows)
    const byTitle = await listGitlabWikiPages({ projectId: 1, titleContains: 'NON DB' }) as any
    expect(byTitle.pages.map((p: any) => p.slug)).toEqual(['How-to-create-non-db-unit-test-(Service)'])
    const bySlug = await listGitlabWikiPages({ projectId: 1, titleContains: 'dev/' }) as any
    expect(bySlug.pages.map((p: any) => p.slug)).toEqual(['dev/Setup'])
  })

  it('applies the limit and flags truncation', async () => {
    vi.mocked(gitlabGet).mockResolvedValue(rows)
    expect(await listGitlabWikiPages({ projectId: 1, limit: 2 })).toMatchObject({ total: 3, count: 2, truncated: true })
  })

  it('needs a projectId or projectPath', async () => {
    await expect(listGitlabWikiPages({})).rejects.toThrow('Provide projectId or projectPath')
    expect(gitlabGet).not.toHaveBeenCalled()
  })
})
