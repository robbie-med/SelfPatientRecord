import OpenAI from 'openai';

export interface AIConfig {
  enabled: boolean;
  provider: string;
  baseUrl: string;
  apiKey: string;
  extractionModel: string;
  chatModel: string;
}

export function createAIClientFromConfig(config: AIConfig): OpenAI {
  return new OpenAI({
    baseURL: config.baseUrl,
    apiKey: config.apiKey || 'no-key-set',
  });
}

export function envFallbackConfig(): AIConfig {
  return {
    enabled: process.env.AI_ENABLED === 'true' && !!process.env.AI_API_KEY,
    provider: 'custom',
    baseUrl: process.env.AI_BASE_URL ?? 'https://api.ppq.ai/v1',
    apiKey: process.env.AI_API_KEY ?? '',
    extractionModel: process.env.AI_MODEL ?? 'anthropic/claude-3.5-haiku',
    chatModel: process.env.AI_MODEL ?? 'anthropic/claude-3.5-haiku',
  };
}
