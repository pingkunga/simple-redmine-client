import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import { searchRedmine } from './searchRedmine'

vi.mock('axios', () => ({ default: { get: vi.fn() } }))

const ctx = { redmineUrl: 'http://r', headers: { k: 'v' } }
const get = axios.get as unknown as ReturnType<typeof vi.fn>

const reply = (results: unknown[], total = results.length) =>
  get.mockResolvedValue({ data: { results, total_count: total, offset: 0, limit: 25 } })

describe('searchRedmine', () => {
  beforeEach(() => get.mockReset())

  it('searches all projects, issues, wiki pages and forum messages, titles only, by default', async () => {
    reply([])
    await searchRedmine({ q: '7.5.44.1' }, ctx)
    expect(get).toHaveBeenCalledWith('http://r/search.json', expect.objectContaining({
      headers: ctx.headers,
      timeout: 25_000,
      params: { q: '7.5.44.1', scope: 'all', issues: 1, wiki_pages: 1, messages: 1, titles_only: 1, offset: 0, limit: 25 },
    }))
  })

  it('uses the project search URL and no scope when projectId is given', async () => {
    reply([])
    await searchRedmine({ q: 'abc', projectId: 5, titlesOnly: false, openIssuesOnly: true, types: ['issues'] }, ctx)
    const [url, options] = get.mock.calls[0]
    expect(url).toBe('http://r/projects/5/search.json')
    expect(options.params).toEqual({ q: 'abc', issues: 1, open_issues: 1, offset: 0, limit: 25 })
  })

  it('maps results and cuts long descriptions to a plain-text snippet', async () => {
    reply([{ id: 1, type: 'issue', title: 'T', url: 'http://u', description: 'x'.repeat(500), datetime: 'd' }])
    const out = await searchRedmine({ q: 'ab' }, ctx)
    expect(out.results[0]).toMatchObject({ type: 'issue', id: 1, title: 'T', url: 'http://u', snippetTruncated: true })
    expect(out.results[0].snippet.length).toBeLessThanOrEqual(301)
  })

  it('always returns a url: keeps a forum message url, completes relative ones, rebuilds issues, never guesses others', async () => {
    reply([
      { id: 1, type: 'message', title: 'M', url: 'http://r/boards/2/topics/9' },
      { id: 2, type: 'reply', title: 'R', url: '/boards/2/topics/9#message-12' },
      { id: 3, type: 'issue', title: 'I' },
      { id: 4, type: 'message', title: 'No url', url: '  ' },
    ])
    const out = await searchRedmine({ q: 'forum', types: ['messages'] }, ctx)
    expect(out.results.map(r => r.url)).toEqual([
      'http://r/boards/2/topics/9',
      'http://r/boards/2/topics/9#message-12',
      'http://r/issues/3',
      null,
    ])
  })

  it('returns an empty list when nothing matches', async () => {
    reply([])
    expect(await searchRedmine({ q: 'zz' }, ctx)).toEqual({ total: 0, offset: 0, count: 0, truncated: false, results: [] })
  })

  it('flags truncation when more results exist', async () => {
    reply([{ id: 1, type: 'issue', title: 'T', url: 'u' }], 40)
    const out = await searchRedmine({ q: 'ab' }, ctx)
    expect(out.truncated).toBe(true)
    expect(out.results[0].snippet).toBe('')
  })

  it('rejects a query that is too short or too long', async () => {
    await expect(searchRedmine({ q: 'a' }, ctx)).rejects.toThrow()
    await expect(searchRedmine({ q: 'a'.repeat(101) }, ctx)).rejects.toThrow()
    expect(get).not.toHaveBeenCalled()
  })
})
