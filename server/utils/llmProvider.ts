import type { LanguageModel } from 'ai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createAzure } from '@ai-sdk/azure';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

export const LLM_PROVIDERS = ['anthropic', 'google', 'openai', 'azure', 'ollama', 'lmstudio'] as const;
export type LlmProviderName = (typeof LLM_PROVIDERS)[number];

/** The slice of runtimeConfig this factory reads. */
export interface LlmConfig {
  llmProvider?: string;
  /** Model id (azure: the deployment name). */
  llmModel?: string;
  /** Not needed for ollama/lmstudio. */
  llmApiKey?: string;
  /**
   * azure: required, e.g. `https://<res>.openai.azure.com/openai/v1` or
   * `https://<res>.openai.azure.com/openai?api-version=2024-10-21`.
   * anthropic/google/openai: optional override. ollama/lmstudio: defaults to localhost.
   */
  llmEndpoint?: string;
}

const DEFAULT_ENDPOINTS = {
  ollama: 'http://localhost:11434/v1',
  lmstudio: 'http://localhost:1234/v1',
} as const;

const ENV_NAMES: Record<keyof LlmConfig, string> = {
  llmProvider: 'NUXT_LLM_PROVIDER',
  llmModel: 'NUXT_LLM_MODEL',
  llmApiKey: 'NUXT_LLM_API_KEY',
  llmEndpoint: 'NUXT_LLM_ENDPOINT',
};

const need = (provider: string, key: keyof LlmConfig, value: string | undefined): string => {
  const v = value?.trim();
  // Names the config key only; never echoes a value.
  if (!v) throw new Error(`LLM provider "${provider}" requires runtimeConfig.${key} (${ENV_NAMES[key]})`);
  return v;
};

/**
 * Azure endpoints may carry `?api-version=...` (the SDK would append its path after the query
 * string and break the URL), so split it out and pass it as `apiVersion`. Without a version the
 * SDK default applies; `/openai/v1` endpoints need none.
 */
const parseAzureEndpoint = (endpoint: string): { baseURL: string; apiVersion?: string } => {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error('LLM provider "azure": runtimeConfig.llmEndpoint (NUXT_LLM_ENDPOINT) is not a valid URL');
  }
  const apiVersion = url.searchParams.get('api-version') || undefined;
  url.search = '';
  url.hash = '';
  return { baseURL: url.toString().replace(/\/+$/, ''), apiVersion };
};

/**
 * Turns config into an `ai` SDK LanguageModel. Fails closed with a message naming the missing
 * key. OpenAI uses Chat Completions (`.chat`) and local servers use `openai-compatible`,
 * because `@ai-sdk/openai@3` defaults to the Responses API that Ollama/LM Studio don't implement.
 */
export const createLanguageModel = (cfg: LlmConfig): LanguageModel => {
  const provider = cfg.llmProvider?.trim().toLowerCase();
  if (!provider) throw new Error('LLM chat is disabled: runtimeConfig.llmProvider (NUXT_LLM_PROVIDER) is not set');
  if (!(LLM_PROVIDERS as readonly string[]).includes(provider)) {
    throw new Error(`Unknown LLM provider "${provider}". Use one of: ${LLM_PROVIDERS.join(', ')}`);
  }

  const model = need(provider, 'llmModel', cfg.llmModel);
  const endpoint = cfg.llmEndpoint?.trim() || undefined;

  switch (provider as LlmProviderName) {
    case 'anthropic':
      return createAnthropic({ apiKey: need(provider, 'llmApiKey', cfg.llmApiKey), baseURL: endpoint })(model);
    case 'google':
      return createGoogleGenerativeAI({ apiKey: need(provider, 'llmApiKey', cfg.llmApiKey), baseURL: endpoint })(model);
    case 'openai':
      return createOpenAI({ apiKey: need(provider, 'llmApiKey', cfg.llmApiKey), baseURL: endpoint }).chat(model);
    case 'azure':
      return createAzure({
        apiKey: need(provider, 'llmApiKey', cfg.llmApiKey),
        ...parseAzureEndpoint(need(provider, 'llmEndpoint', endpoint)),
      }).chat(model);
    case 'ollama':
    case 'lmstudio':
      return createOpenAICompatible({ name: provider, baseURL: endpoint ?? DEFAULT_ENDPOINTS[provider as 'ollama' | 'lmstudio'] }).chatModel(model);
  }
};

/** Reads runtimeConfig and builds the model. The chat route calls this once and never branches on provider. */
export const getLanguageModel = (): LanguageModel => createLanguageModel(useRuntimeConfig() as LlmConfig);
