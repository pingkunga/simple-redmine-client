import { describe, expect, it } from 'vitest'
import { extractRelateCode } from './relateCode'

const MR = 'http://dev.REDACTED.local/invest/invest-net-resource/-/merge_requests/619'

describe('extractRelateCode', () => {
  it('finds a merge request link inside textile text', () => {
    const text = `h3. Problem#1\r\n\r\n- Merge Request: ${MR}\r\n\r\nh3. Problem#N\r\n- Merge Request: \r\n`
    expect(extractRelateCode(text, 'description')).toEqual([
      { type: 'merge_request', url: MR, projectPath: 'invest/invest-net-resource', iid: 619, foundIn: 'description' },
    ])
  })

  it('finds a commit link and lowercases the sha', () => {
    const url = 'http://dev.REDACTED.local/invest/invest-net-resource/-/commit/AB12CD3'
    expect(extractRelateCode(`see ${url}.`, 'journal:1')).toEqual([
      { type: 'commit', url, projectPath: 'invest/invest-net-resource', sha: 'ab12cd3', foundIn: 'journal:1' },
    ])
  })

  it('strips trailing /diffs, anchors and punctuation, and dedupes within and across calls', () => {
    const seen = new Set<string>()
    const first = extractRelateCode(`${MR}/diffs#note_1, and again ${MR}.`, 'description', seen)
    expect(first).toHaveLength(1)
    expect(first[0]!.url).toBe(MR)
    expect(extractRelateCode(MR, 'journal:2', seen)).toEqual([])
  })

  it('ignores non-GitLab text and empty input', () => {
    expect(extractRelateCode('no links here, http://example.com/a/b', 'description')).toEqual([])
    expect(extractRelateCode(null, 'description')).toEqual([])
    expect(extractRelateCode('', 'description')).toEqual([])
  })
})
