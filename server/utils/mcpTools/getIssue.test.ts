import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getIssue, getIssueTool } from './getIssue'

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>()
  return { ...actual, default: { ...actual.default, get: vi.fn(), isAxiosError: actual.default.isAxiosError } }
})

const ctx = { redmineUrl: 'http://r', headers: { k: 'v' } }
const MR = 'http://dev.REDACTED.local/invest/invest-net-resource/-/merge_requests/619'

// Modelled on issue 380442 (a Defect with journals, a description edit, a cf change and an attachment).
const issue = (over: Record<string, unknown> = {}) => ({
  id: 380442,
  project: { id: 858, name: 'Bonanza Investment .NET' },
  tracker: { id: 8, name: 'Defect' },
  status: { id: 26, name: 'Waiting for test', is_closed: false },
  priority: { id: 3, name: 'Minor' },
  author: { id: 230, name: 'DEV-TM Chatri N.' },
  assigned_to: { id: 39, name: 'QA-INV' },
  fixed_version: { id: 6090, name: '8.9.8.0' },
  subject: '[GSB][MASTER][IMPACT] ProveBy',
  description: `h2. 01\r\n- Merge Request: ${MR}\r\n`,
  start_date: null, due_date: null, done_ratio: 0,
  custom_fields: [
    { id: 41, name: 'Build Version', value: '' },
    { id: 25, name: 'Type of Defect', multiple: true, value: [] },
    { id: 44, name: "Developer's Comment", value: 'Impact\r\n- ปรับ Schema' },
  ],
  created_on: '2025-03-07T07:01:02Z', updated_on: '2025-04-28T14:42:38Z', closed_on: null,
  ...over,
})

const journals = [
  { id: 1, user: { id: 230, name: 'A' }, notes: '', created_on: 't1', private_notes: false, details: [
    { property: 'attr', name: 'description', old_value: 'OLD'.repeat(500), new_value: `NEW ${MR}` },
    { property: 'cf', name: '44', old_value: 'Impact\r\n-', new_value: 'Impact\r\n- x' },
  ] },
  { id: 2, user: { id: 230, name: 'A' }, notes: null, created_on: 't2', private_notes: false, details: [
    { property: 'attachment', name: '70586', old_value: null, new_value: 'dbeaver.png' },
    { property: 'attr', name: 'status_id', old_value: '16', new_value: '26' },
  ] },
  { id: 3, user: { id: 227, name: 'B' }, notes: 'see http://dev.REDACTED.local/g/p/-/commit/abcdef1', created_on: 't3', details: [] },
]

const mockIssue = (over: Record<string, unknown> = {}) =>
  vi.mocked(axios.get).mockResolvedValue({ data: { issue: issue(over) } })

describe('get_issue', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends no include param by default and omits journals/changesets', async () => {
    mockIssue()
    const result = await getIssue({ issueId: 380442 }, ctx) as any

    expect(axios.get).toHaveBeenCalledWith('http://r/issues/380442.json', expect.objectContaining({ headers: ctx.headers, params: {} }))
    expect(result).not.toHaveProperty('journals')
    expect(result).not.toHaveProperty('changesets')
    expect(result).toMatchObject({ id: 380442, tracker: 'Defect', status: 'Waiting for test', isClosed: false, assignedTo: 'QA-INV', fixedVersion: { id: 6090, name: '8.9.8.0' } })
  })

  it('drops empty custom fields and keeps the Impact Note', async () => {
    mockIssue()
    const result = await getIssue({ issueId: 1 }, ctx) as any
    expect(result.customFields).toEqual([{ name: "Developer's Comment", value: 'Impact\n- ปรับ Schema' }])
  })

  it('requests the requested includes only', async () => {
    mockIssue({ journals, changesets: [] })
    await getIssue({ issueId: 1, includeJournals: true }, ctx)
    expect(vi.mocked(axios.get).mock.calls[0]![1]).toMatchObject({ params: { include: 'journals' } })

    await getIssue({ issueId: 1, includeJournals: true, includeChangesets: true }, ctx)
    expect(vi.mocked(axios.get).mock.calls[1]![1]).toMatchObject({ params: { include: 'journals,changesets' } })
  })

  it('maps cf ids to names, elides description edits, keeps attachment and id-valued changes', async () => {
    mockIssue({ journals })
    const result = await getIssue({ issueId: 1, includeJournals: true }, ctx) as any

    expect(result.journalTotal).toBe(3)
    expect(result.journalsTruncated).toBe(false)
    expect(result.journals[0].details).toEqual([
      { property: 'attr', name: 'description', changed: true },
      { property: 'cf', name: "Developer's Comment", oldValue: 'Impact\n-', newValue: 'Impact\n- x' },
    ])
    expect(result.journals[1].details).toEqual([
      { property: 'attachment', name: '70586', oldValue: null, newValue: 'dbeaver.png' },
      { property: 'attr', name: 'status_id', oldValue: '16', newValue: '26' },
    ])
    expect(JSON.stringify(result)).not.toContain('OLDOLD')
  })

  it('keeps the newest journals and flags truncation', async () => {
    mockIssue({ journals })
    const result = await getIssue({ issueId: 1, includeJournals: true, journalLimit: 2 }, ctx) as any
    expect(result.journals.map((j: any) => j.id)).toEqual([2, 3])
    expect(result.journalsTruncated).toBe(true)
  })

  it('collects relateCode from description, journals and changesets without duplicates', async () => {
    mockIssue({ journals, changesets: [{ revision: '9f8e7d6a', comments: 'fix #1', committed_on: 'x' }] })
    const result = await getIssue({ issueId: 1, includeJournals: true, includeChangesets: true }, ctx) as any

    expect(result.relateCode).toEqual([
      { type: 'merge_request', url: MR, projectPath: 'invest/invest-net-resource', iid: 619, foundIn: 'description' },
      { type: 'commit', url: 'http://dev.REDACTED.local/g/p/-/commit/abcdef1', projectPath: 'g/p', sha: 'abcdef1', foundIn: 'journal:3' },
      { type: 'commit', sha: '9f8e7d6a', foundIn: 'changeset' },
    ])
    expect(result.changesets).toEqual([{ revision: '9f8e7d6a', user: undefined, comments: 'fix #1', committedOn: 'x' }])
  })

  it('returns an empty relateCode when there is no link, and tolerates empty changesets', async () => {
    mockIssue({ description: 'plain', changesets: [] })
    const result = await getIssue({ issueId: 1, includeChangesets: true }, ctx) as any
    expect(result.relateCode).toEqual([])
    expect(result.changesets).toEqual([])
  })

  it('finds a link at the end of a description that is longer than the cap', async () => {
    mockIssue({ description: `${'x '.repeat(5000)}\r\n${MR}` })
    const result = await getIssue({ issueId: 1 }, ctx) as any
    expect(result.descriptionTruncated).toBe(true)
    expect(result.relateCode).toHaveLength(1)
  })

  it('reports a missing issue clearly', async () => {
    vi.mocked(axios.get).mockRejectedValue(Object.assign(new Error('nope'), { isAxiosError: true, response: { status: 404 } }))
    await expect(getIssue({ issueId: 9 }, ctx)).rejects.toThrow('Issue 9 not found')
  })

  it('rejects an invalid id without calling Redmine', async () => {
    for (const bad of [0, -1, 1.5, '12', undefined]) {
      await expect(getIssue({ issueId: bad }, ctx)).rejects.toThrow()
    }
    expect(axios.get).not.toHaveBeenCalled()
  })

  it('exposes a tool definition without relations or reactions options', () => {
    expect(getIssueTool.name).toBe('get_issue')
    expect(Object.keys(getIssueTool.inputSchema)).toEqual(['issueId', 'includeJournals', 'includeChangesets', 'journalLimit'])
  })
})
