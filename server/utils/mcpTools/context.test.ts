import { describe, expect, it } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { createToolContext } from './context'

mockNuxtImport('useRuntimeConfig', () => () => ({
  redmineToken: 'tok',
  public: { redmineUrl: 'http://redmine.local' },
}))

describe('createToolContext', () => {
  it('uses the shared server token and the configured Redmine URL', () => {
    expect(createToolContext()).toEqual({
      redmineUrl: 'http://redmine.local',
      headers: { 'Content-Type': 'application/json', 'X-Redmine-API-Key': 'tok' },
    })
  })

  it('uses the caller\'s own key (decoded from base64) when the personal-key header is passed', () => {
    const ctx = createToolContext({ 'x-my-redmine-api-key': btoa('my-own-key') })
    expect(ctx.headers['X-Redmine-API-Key']).toBe('my-own-key')
    expect(ctx.redmineUrl).toBe('http://redmine.local')
  })

  it('falls back to the server token when the personal-key header is empty', () => {
    expect(createToolContext({}).headers['X-Redmine-API-Key']).toBe('tok')
  })
})
