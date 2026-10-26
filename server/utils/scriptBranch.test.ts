import axios from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { assertBranchExists, normalizeScriptBranch, resolveScriptBranch } from './scriptBranch'

const runtimeConfig = vi.hoisted(() => ({ value: {} as Record<string, unknown> }))
mockNuxtImport('useRuntimeConfig', () => () => runtimeConfig.value)

const stubConfig = (overrides: Record<string, unknown> = {}) => {
  runtimeConfig.value = {
    jenkinsScriptRepo: 'invest/invest-net-resource',
    jenkinsDefaultScriptBranch: 'master',
    gitlabToken: 'test-token',
    public: { gitlabUrl: 'http://gitlab.test/' },
    ...overrides
  }
}

const notFound = (message: string) => new axios.AxiosError(
  'Request failed',
  'ERR_BAD_REQUEST',
  undefined,
  undefined,
  { status: 404, data: { message } } as never
)

describe('normalizeScriptBranch', () => {
  it('trims and keeps a valid branch', () => {
    expect(normalizeScriptBranch('  release/8.9.12  ', 'master')).toBe('release/8.9.12')
  })

  it('falls back to the default when empty or missing', () => {
    expect(normalizeScriptBranch('', 'master')).toBe('master')
    expect(normalizeScriptBranch('   ', 'master')).toBe('master')
    expect(normalizeScriptBranch(undefined, 'develop')).toBe('develop')
    expect(normalizeScriptBranch(null, 'develop')).toBe('develop')
  })

  it.each(['-x', '--force', 'a b', 'a;rm', 'a..b', 'a$(x)', 'ก', 'a'.repeat(201)])('rejects %j', (value) => {
    expect(() => normalizeScriptBranch(value, 'master')).toThrowError(expect.objectContaining({ statusCode: 400 }))
  })

  it('rejects a non-string value and an empty default', () => {
    expect(() => normalizeScriptBranch(123, 'master')).toThrowError(expect.objectContaining({ statusCode: 400 }))
    expect(() => normalizeScriptBranch('', '')).toThrowError(expect.objectContaining({ statusCode: 400 }))
  })
})

describe('resolveScriptBranch', () => {
  it('uses the configured default branch', () => {
    stubConfig({ jenkinsDefaultScriptBranch: 'develop' })
    expect(resolveScriptBranch('')).toBe('develop')
    expect(resolveScriptBranch('feature/x')).toBe('feature/x')
  })
})

describe('assertBranchExists', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('asks GitLab with the repo and branch URL-encoded', async () => {
    stubConfig()
    const get = vi.spyOn(axios, 'get').mockResolvedValue({ data: {} })

    await assertBranchExists('release/8.9')

    expect(get).toHaveBeenCalledWith(
      'http://gitlab.test/api/v4/projects/invest%2Finvest-net-resource/repository/branches/release%2F8.9',
      expect.objectContaining({ headers: { 'PRIVATE-TOKEN': 'test-token' } })
    )
  })

  it('skips the check when no repo is configured', async () => {
    stubConfig({ jenkinsScriptRepo: '' })
    const get = vi.spyOn(axios, 'get')

    await assertBranchExists('anything')

    expect(get).not.toHaveBeenCalled()
  })

  it('answers 400 when the branch is missing', async () => {
    stubConfig()
    vi.spyOn(axios, 'get').mockRejectedValue(notFound('404 Branch Not Found'))

    await expect(assertBranchExists('nope')).rejects.toMatchObject({ statusCode: 400 })
  })

  it('answers 502 when the project is missing or the lookup fails', async () => {
    stubConfig()
    const get = vi.spyOn(axios, 'get')

    get.mockRejectedValueOnce(notFound('404 Project Not Found'))
    await expect(assertBranchExists('main')).rejects.toMatchObject({ statusCode: 502 })

    get.mockRejectedValueOnce(new Error('ECONNREFUSED'))
    await expect(assertBranchExists('main')).rejects.toMatchObject({ statusCode: 502 })
  })
})
