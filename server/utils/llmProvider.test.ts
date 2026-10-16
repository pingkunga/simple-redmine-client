import { describe, expect, it } from 'vitest'
import { createLanguageModel, LLM_PROVIDERS } from './llmProvider'

// Real adapters, no network: building a model object makes no request.
type Info = { provider: string; modelId: string; config?: { url?: (o: { path: string; modelId: string }) => string } }
const make = (cfg: Parameters<typeof createLanguageModel>[0]) => createLanguageModel(cfg) as unknown as Info
const urlOf = (m: Info) => m.config?.url?.({ path: '/chat/completions', modelId: m.modelId })

describe('createLanguageModel', () => {
  it('builds an Anthropic model', () => {
    const m = make({ llmProvider: 'anthropic', llmModel: 'claude-x', llmApiKey: 'k' })
    expect(m.provider).toMatch(/anthropic/)
    expect(m.modelId).toBe('claude-x')
  })

  it('builds a Google model', () => {
    const m = make({ llmProvider: 'google', llmModel: 'gemini-x', llmApiKey: 'k' })
    expect(m.provider).toMatch(/google/)
    expect(m.modelId).toBe('gemini-x')
  })

  it('builds OpenAI on Chat Completions, not the Responses API', () => {
    const m = make({ llmProvider: 'openai', llmModel: 'gpt-x', llmApiKey: 'k' })
    expect(m.provider).toBe('openai.chat')
    expect(m.modelId).toBe('gpt-x')
  })

  it('lets a cloud provider use a custom endpoint (e.g. a gateway)', () => {
    const m = make({ llmProvider: 'openai', llmModel: 'gpt-x', llmApiKey: 'k', llmEndpoint: 'https://gw.example.com/v1' })
    expect(urlOf(m)).toBe('https://gw.example.com/v1/chat/completions')
  })

  describe('azure endpoint', () => {
    const azure = (llmEndpoint: string) => make({ llmProvider: 'azure', llmModel: 'my-deploy', llmApiKey: 'k', llmEndpoint })

    it('accepts the v1 endpoint with no api-version', () => {
      const m = azure('https://res.openai.azure.com/openai/v1')
      expect(m.provider).toMatch(/azure/)
      expect(m.modelId).toBe('my-deploy')
      expect(urlOf(m)).toBe('https://res.openai.azure.com/openai/v1/chat/completions')
    })

    it('splits ?api-version out of the endpoint instead of breaking the URL', () => {
      const url = urlOf(azure('https://res.openai.azure.com/openai?api-version=2024-10-21'))!
      expect(url.startsWith('https://res.openai.azure.com/openai/v1/chat/completions')).toBe(true)
      expect(new URL(url).searchParams.get('api-version')).toBe('2024-10-21')
      expect(url.match(/\?/g)).toHaveLength(1)
    })

    it('tolerates a trailing slash', () => {
      expect(urlOf(azure('https://res.openai.azure.com/openai/v1/'))).toBe('https://res.openai.azure.com/openai/v1/chat/completions')
    })

    it('requires an endpoint and rejects one that is not a URL', () => {
      expect(() => make({ llmProvider: 'azure', llmModel: 'm', llmApiKey: 'k' })).toThrow(/llmEndpoint \(NUXT_LLM_ENDPOINT\)/)
      expect(() => azure('not a url')).toThrow(/not a valid URL/)
    })
  })

  it('builds Ollama and LM Studio with default localhost URLs and no API key', () => {
    const o = make({ llmProvider: 'ollama', llmModel: 'qwen' })
    const l = make({ llmProvider: 'lmstudio', llmModel: 'llama' })
    expect(o.provider).toMatch(/^ollama/)
    expect(l.provider).toMatch(/^lmstudio/)
    expect(urlOf(o)).toBe('http://localhost:11434/v1/chat/completions')
    expect(urlOf(l)).toBe('http://localhost:1234/v1/chat/completions')
  })

  it('lets the endpoint override the local default', () => {
    expect(urlOf(make({ llmProvider: 'ollama', llmModel: 'qwen', llmEndpoint: 'http://gpu-box:11434/v1' }))).toBe('http://gpu-box:11434/v1/chat/completions')
  })

  it('is case/space tolerant on the provider name', () => {
    expect(() => make({ llmProvider: ' Anthropic ', llmModel: 'm', llmApiKey: 'k' })).not.toThrow()
  })

  it('is disabled when no provider is set', () => {
    expect(() => make({})).toThrow(/disabled/)
    expect(() => make({ llmProvider: '  ' })).toThrow(/disabled/)
  })

  it('rejects an unknown provider and lists the valid ones', () => {
    expect(() => make({ llmProvider: 'bedrock', llmModel: 'm' })).toThrow(/Unknown LLM provider "bedrock".*anthropic/)
  })

  it('requires a model for every provider', () => {
    for (const p of LLM_PROVIDERS) {
      expect(() => make({ llmProvider: p }), p).toThrow(/runtimeConfig\.llmModel \(NUXT_LLM_MODEL\)/)
    }
  })

  it('requires an API key for every cloud provider, naming the env var', () => {
    for (const p of ['anthropic', 'google', 'openai', 'azure']) {
      expect(() => make({ llmProvider: p, llmModel: 'm', llmEndpoint: 'https://res.openai.azure.com/openai/v1' }), p).toThrow(/llmApiKey \(NUXT_LLM_API_KEY\)/)
    }
  })

  it('treats a blank key as missing and never echoes a key value in errors', () => {
    const secret = 'sk-super-secret'
    expect(() => make({ llmProvider: 'anthropic', llmModel: 'm', llmApiKey: '   ' })).toThrow(/llmApiKey/)
    try {
      make({ llmProvider: 'azure', llmModel: 'm', llmApiKey: secret, llmEndpoint: 'not a url' })
      expect.unreachable()
    } catch (e) {
      expect((e as Error).message).not.toContain(secret)
    }
  })
})
