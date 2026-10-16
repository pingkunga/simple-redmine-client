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
})
