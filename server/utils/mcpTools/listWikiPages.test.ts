import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import { listWikiPages } from './listWikiPages'

vi.mock('axios', () => ({ default: { get: vi.fn(), isAxiosError: (e: any) => !!e?.response } }))

const ctx = { redmineUrl: 'http://r', headers: { k: 'v' } }
const get = axios.get as unknown as ReturnType<typeof vi.fn>

const pages = [
  { title: 'Wiki', version: 60, created_on: 'c0', updated_on: 'u0' },
  { title: 'DOTNET6_MIGRATE_CHECKLIST', parent: { title: 'Wiki' }, version: 63, created_on: 'c1', updated_on: 'u1' },
  { title: 'NEW_CONFIG_SYSTEM', parent: { title: 'DOTNET6_MIGRATE_CHECKLIST' }, version: 7, created_on: 'c2', updated_on: 'u2' },
]

describe('listWikiPages', () => {
  beforeEach(() => get.mockReset())

  it('calls the wiki index with the caller headers and maps the fields', async () => {
    get.mockResolvedValue({ data: { wiki_pages: pages } })
    const out = await listWikiPages({ projectId: 7 }, ctx)
    expect(get).toHaveBeenCalledWith('http://r/projects/7/wiki/index.json', expect.objectContaining({ headers: ctx.headers, timeout: 10_000 }))
    expect(out).toMatchObject({ total: 3, count: 3, truncated: false })
    expect(out.pages[1]).toEqual({ title: 'DOTNET6_MIGRATE_CHECKLIST', parent: 'Wiki', version: 63, createdOn: 'c1', updatedOn: 'u1' })
    expect(out.pages[0].parent).toBeUndefined()
  })

  it('accepts a project identifier', async () => {
    get.mockResolvedValue({ data: { wiki_pages: [] } })
    await listWikiPages({ projectId: 'my proj' }, ctx)
    expect(get.mock.calls[0][0]).toBe('http://r/projects/my%20proj/wiki/index.json')
  })

  it('filters by titleContains case-insensitively', async () => {
    get.mockResolvedValue({ data: { wiki_pages: pages } })
    const out = await listWikiPages({ projectId: 7, titleContains: 'config' }, ctx)
    expect(out.pages.map(p => p.title)).toEqual(['NEW_CONFIG_SYSTEM'])
  })

  it('applies the limit and flags truncation', async () => {
    get.mockResolvedValue({ data: { wiki_pages: pages } })
    const out = await listWikiPages({ projectId: 7, limit: 2 }, ctx)
    expect(out).toMatchObject({ total: 3, count: 2, truncated: true })
  })

  it('explains a 404', async () => {
    get.mockRejectedValueOnce({ response: { status: 404 } })
    await expect(listWikiPages({ projectId: 7 }, ctx)).rejects.toThrow('not found or it has no wiki')
  })

  it('rejects a missing projectId', async () => {
    await expect(listWikiPages({}, ctx)).rejects.toThrow()
    expect(get).not.toHaveBeenCalled()
  })
})
