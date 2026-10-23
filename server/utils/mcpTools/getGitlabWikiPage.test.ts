import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getGitlabWikiPage } from './getGitlabWikiPage'
import { gitlabGet } from './gitlabApi'

vi.mock('./gitlabApi', async importOriginal => ({
  ...(await importOriginal<typeof import('./gitlabApi')>()),
  gitlabGet: vi.fn(),
}))

const page = (content: string) => ({ slug: 's', title: 'T', format: 'markdown', encoding: 'UTF-8', content })
const call = () => vi.mocked(gitlabGet).mock.calls[0]!

describe('get_gitlab_wiki_page', () => {
  beforeEach(() => vi.clearAllMocks())

  it('reads a page by project path and slug taken from a wiki link', async () => {
    vi.mocked(gitlabGet).mockResolvedValue(page('# Hello'))
    const out = await getGitlabWikiPage({ projectPath: 'invest/invest-service', slug: 'How-to-create-non-db-unit-test-(Service)' }) as any
    expect(call()[0]).toBe(`/projects/invest%2Finvest-service/wikis/${encodeURIComponent('How-to-create-non-db-unit-test-(Service)')}`)
    expect(call()[1]).toBeUndefined()
    expect(out).toEqual({
      slug: 's', title: 'T', format: 'markdown', encoding: 'UTF-8', content: '# Hello',
      contentLength: 7, contentTruncated: false, nextContentOffset: undefined,
    })
  })

  it('encodes a directory slash as %2F and Thai text once', async () => {
    vi.mocked(gitlabGet).mockResolvedValue(page('x'))
    await getGitlabWikiPage({ projectId: 5, slug: 'dev/วิธีใช้' })
    expect(call()[0]).toBe(`/projects/5/wikis/dev%2F${encodeURIComponent('วิธีใช้')}`)
  })

  it('does not double-encode a slug copied from a browser URL', async () => {
    vi.mocked(gitlabGet).mockResolvedValue(page('x'))
    await getGitlabWikiPage({ projectId: 5, slug: `dev%2F${encodeURIComponent('วิธีใช้')}` })
    expect(call()[0]).toBe(`/projects/5/wikis/dev%2F${encodeURIComponent('วิธีใช้')}`)
  })

  it('keeps a malformed percent sequence instead of throwing', async () => {
    vi.mocked(gitlabGet).mockResolvedValue(page('x'))
    await getGitlabWikiPage({ projectId: 5, slug: '100%ZZ%E0%A4' })
    expect(call()[0]).toBe(`/projects/5/wikis/${encodeURIComponent('100%ZZ%E0%A4')}`)
  })

  it('passes a version SHA and rejects anything else', async () => {
    vi.mocked(gitlabGet).mockResolvedValue(page('x'))
    await getGitlabWikiPage({ projectId: 5, slug: 'home', version: 'ab12cd3' })
    expect(call()[1]).toEqual({ version: 'ab12cd3' })
    await expect(getGitlabWikiPage({ projectId: 5, slug: 'home', version: '1; drop' })).rejects.toThrow()
  })

  it('returns a long page in parts and lets the caller continue', async () => {
    vi.mocked(gitlabGet).mockResolvedValue(page('a'.repeat(250)))
    const first = await getGitlabWikiPage({ projectId: 5, slug: 'home', maxChars: 100 }) as any
    expect(first).toMatchObject({ contentLength: 250, contentTruncated: true, nextContentOffset: 100 })
    expect(first.content).toHaveLength(100)

    const last = await getGitlabWikiPage({ projectId: 5, slug: 'home', maxChars: 100, textOffset: 200 }) as any
    expect(last.content).toHaveLength(50)
    expect(last.contentTruncated).toBe(false)
    expect(last.nextContentOffset).toBeUndefined()
  })

  it('keeps markdown code blocks and html intact', async () => {
    const md = '```\ndotnet test --filter "Category!=DB"\n```\n<details>x</details>'
    vi.mocked(gitlabGet).mockResolvedValue(page(md))
    expect(((await getGitlabWikiPage({ projectId: 5, slug: 'home' })) as any).content).toBe(md)
  })

  it('rejects an empty slug, an oversized maxChars, or a missing project', async () => {
    await expect(getGitlabWikiPage({ projectId: 5, slug: '' })).rejects.toThrow()
    await expect(getGitlabWikiPage({ projectId: 5, slug: 'home', maxChars: 20_001 })).rejects.toThrow()
    await expect(getGitlabWikiPage({ slug: 'home' })).rejects.toThrow('Provide projectId or projectPath')
    expect(gitlabGet).not.toHaveBeenCalled()
  })
})
