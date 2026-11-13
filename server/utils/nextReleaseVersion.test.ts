import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { buildNextReleaseVersion, nextReleaseInputSchema, parseNextReleaseInput } from './nextReleaseVersion'
import { DEFAULT_RELEASE_PROJECT_ID } from './releaseService'

const config = { versionMinorDefault: 0, versionTimezone: 'Asia/Bangkok' }

describe('parseNextReleaseInput', () => {
  it('coerces query strings and defaults projectId', () => {
    expect(parseNextReleaseInput({ major: '9', monthOffset: '-1' })).toEqual({
      major: 9, monthOffset: -1, projectId: DEFAULT_RELEASE_PROJECT_ID,
    })
  })

  it.each([
    [{}], // major missing
    [{ major: '0' }],
    [{ major: '9', monthOffset: '99' }],
    [{ major: '9', date: '13/11/2026' }],
  ])('rejects %j with 400', (raw) => {
    expect(() => parseNextReleaseInput(raw)).toThrow(expect.objectContaining({ statusCode: 400 }))
  })

  it('accepts an extended schema', () => {
    const schema = nextReleaseInputSchema.extend({ createJenkinsFolder: z.boolean().default(true) })
    expect(parseNextReleaseInput({ major: 9 }, schema).createJenkinsFolder).toBe(true)
  })
})

describe('buildNextReleaseVersion', () => {
  it('maps the generated name into the Version layout', () => {
    const v = buildNextReleaseVersion({ major: 10, minor: 1, date: '2026-11-27', projectId: 858 }, config)
    expect(v).toMatchObject({
      id: -1, name: '10.1.2611.4', status: 'open', sharing: 'tree', due_date: '2026-11-29',
      projectid: 858, scriptBranch: '', meta: { yymm: '2611', week: 4, isLastOfMonth: true },
    })
  })

  it('uses versionMinorDefault when minor is omitted', () => {
    const v = buildNextReleaseVersion({ major: 10, date: '2026-11-27', projectId: 858 }, { ...config, versionMinorDefault: 2 })
    expect(v.name).toBe('10.2.2611.4')
  })

  it('a bad versionMinorDefault is a 500', () => {
    expect(() => buildNextReleaseVersion({ major: 10, date: '2026-11-27', projectId: 858 }, { ...config, versionMinorDefault: 'x' }))
      .toThrow(expect.objectContaining({ statusCode: 500 }))
  })

  it('a weekend date is a 400', () => {
    expect(() => buildNextReleaseVersion({ major: 10, minor: 1, date: '2027-05-01', projectId: 858 }, config))
      .toThrow(expect.objectContaining({ statusCode: 400 }))
  })
})
