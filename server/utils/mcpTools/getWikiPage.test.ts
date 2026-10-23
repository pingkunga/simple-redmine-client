import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios from 'axios'
import { getWikiPage } from './getWikiPage'

vi.mock('axios', () => ({ default: { get: vi.fn(), isAxiosError: (e: any) => !!e?.response } }))

const ctx = { redmineUrl: 'http://r', headers: { k: 'v' } }
const get = axios.get as unknown as ReturnType<typeof vi.fn>

const page = (extra: Record<string, unknown> = {}) => ({
  title: 'T', parent: { title: 'Wiki' }, text: 'h1. Hello', version: 3,
  author: { id: 1, name: 'Dev' }, comments: '', created_on: 'c', updated_on: 'u', ...extra,
})
const reply = (extra?: Record<string, unknown>) => get.mockResolvedValue({ data: { wiki_page: page(extra) } })

describe('getWikiPage', () => {
  beforeEach(() => get.mockReset())

  it('reads the current page and maps the fields', async () => {
    reply()
    const out = await getWikiPage({ projectId: 7, title: 'T' }, ctx)
    expect(get).toHaveBeenCalledWith('http://r/projects/7/wiki/T.json', expect.objectContaining({ headers: ctx.headers, timeout: 10_000, params: undefined }))
    expect(out).toMatchObject({
      title: 'T', parent: 'Wiki', version: 3, author: 'Dev', text: 'h1. Hello',
      textLength: 9, textTruncated: false, createdOn: 'c', updatedOn: 'u',
    })
    expect(out.comments).toBeUndefined()
    expect(out.nextTextOffset).toBeUndefined()
    expect(out.attachments).toBeUndefined()
  })

  it('encodes Thai, parentheses and keeps a trailing underscore', async () => {
    reply()
    await getWikiPage({ projectId: 'p', title: 'How_to_Rebuild_(สำหรับ_ทดสอบ)_' }, ctx)
    expect(get.mock.calls[0][0]).toBe(`http://r/projects/p/wiki/${encodeURIComponent('How_to_Rebuild_(สำหรับ_ทดสอบ)_')}.json`)
    expect(get.mock.calls[0][0].endsWith('_.json')).toBe(true)
  })

  it('requests a specific version', async () => {
    reply()
    await getWikiPage({ projectId: 7, title: 'T', version: 23 }, ctx)
    expect(get.mock.calls[0][0]).toBe('http://r/projects/7/wiki/T/23.json')
  })

  it('includes attachment metadata only, without the download url', async () => {
    reply({ attachments: [{ id: 9, filename: 'a.png', filesize: 10, content_type: 'image/png', description: '', created_on: 'x', content_url: 'http://secret' }] })
    const out = await getWikiPage({ projectId: 7, title: 'T', includeAttachments: true }, ctx)
    expect(get.mock.calls[0][1].params).toEqual({ include: 'attachments' })
    expect(out.attachments).toEqual([{ id: 9, filename: 'a.png', filesize: 10, contentType: 'image/png', description: undefined, createdOn: 'x' }])
    expect(JSON.stringify(out)).not.toContain('secret')
  })

  it('returns a long page in parts and lets the caller continue', async () => {
    const text = 'a'.repeat(250)
    reply({ text })
    const first = await getWikiPage({ projectId: 7, title: 'T', maxChars: 100 }, ctx)
    expect(first).toMatchObject({ textLength: 250, textTruncated: true, nextTextOffset: 100 })
    expect(first.text).toHaveLength(100)

    const last = await getWikiPage({ projectId: 7, title: 'T', maxChars: 100, textOffset: 200 }, ctx)
    expect(last.text).toHaveLength(50)
    expect(last.textTruncated).toBe(false)
    expect(last.nextTextOffset).toBeUndefined()
  })

  it('keeps raw textile and html code blocks intact', async () => {
    reply({ text: '<pre><code>npm login</code></pre>' })
    expect((await getWikiPage({ projectId: 7, title: 'T' }, ctx)).text).toBe('<pre><code>npm login</code></pre>')
  })

  it('explains 404 and 403', async () => {
    get.mockRejectedValueOnce({ response: { status: 404 } })
    await expect(getWikiPage({ projectId: 7, title: 'Nope' }, ctx)).rejects.toThrow('Wiki page "Nope" not found in project 7')
    get.mockRejectedValueOnce({ response: { status: 403 } })
    await expect(getWikiPage({ projectId: 7, title: 'T' }, ctx)).rejects.toThrow('No permission')
  })

  it('rejects an empty title or an oversized maxChars', async () => {
    await expect(getWikiPage({ projectId: 7, title: '' }, ctx)).rejects.toThrow()
    await expect(getWikiPage({ projectId: 7, title: 'T', maxChars: 20_001 }, ctx)).rejects.toThrow()
    expect(get).not.toHaveBeenCalled()
  })
})
