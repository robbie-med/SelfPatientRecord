import OpenAI from 'openai';

export function createAIClient(): OpenAI {
  return new OpenAI({
    baseURL: process.env.AI_BASE_URL ?? 'https://api.openai.com/v1',
    apiKey: process.env.AI_API_KEY ?? 'no-key-set',
  });
}

export function isAIEnabled(): boolean {
  return process.env.AI_ENABLED === 'true' && !!process.env.AI_API_KEY;
}

export function getModel(): string {
  return process.env.AI_MODEL ?? 'gpt-4o-mini';
}
