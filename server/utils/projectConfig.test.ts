import { describe, expect, it, vi, beforeEach } from 'vitest'
import fs from 'fs'
import {
  assertProjectSupported,
  assertTrackerSupported,
  assertGitLabProjectSupported,
} from './projectConfig'

vi.mock('fs', () => ({
  default: { readFileSync: vi.fn(), existsSync: vi.fn() },
}))

const files = (map: Record<string, unknown>) => {
  vi.mocked(fs.existsSync).mockImplementation((p) => Object.keys(map).some(name => String(p).endsWith(name)))
  vi.mocked(fs.readFileSync).mockImplementation((p) => {
    const name = Object.keys(map).find(n => String(p).endsWith(n))
    if (!name) throw new Error('ENOENT')
    return typeof map[name] === 'string' ? (map[name] as string) : JSON.stringify(map[name])
  })
}

describe('allowlist assertions (fail-closed)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  const cases = [
    { kind: 'project', file: 'SupportProject.json', assert: assertProjectSupported },
    { kind: 'tracker', file: 'SupportTracker.json', assert: assertTrackerSupported },
    { kind: 'gitlab project', file: 'SupportGitLabProject.json', assert: assertGitLabProjectSupported },
  ]

  for (const { kind, file, assert } of cases) {
    describe(kind, () => {
      it('passes for an id in the allowlist (number or numeric string)', () => {
        files({ [file]: [{ id: 5, name: 'A' }] })
        expect(() => assert(5)).not.toThrow()
        expect(() => assert('5')).not.toThrow()
      })

      it('throws for an id not in the allowlist', () => {
        files({ [file]: [{ id: 5, name: 'A' }] })
        expect(() => assert(6)).toThrow(/not in the supported list/)
        expect(() => assert('abc')).toThrow(/not in the supported list/)
        expect(() => assert(undefined)).toThrow(/not in the supported list/)
      })

      it('throws when the allowlist is empty', () => {
        files({ [file]: [] })
        expect(() => assert(5)).toThrow(/empty or unreadable/)
      })

      it('throws when the config file is missing or unreadable', () => {
        files({})
        expect(() => assert(5)).toThrow(/empty or unreadable/)
      })

      it('throws when the config file is invalid JSON', () => {
        files({ [file]: '{not json' })
        expect(() => assert(5)).toThrow(/empty or unreadable/)
      })
    })
  }
})
