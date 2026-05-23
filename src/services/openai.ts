import type { Env } from '../types';
import { getSecret, getSetting } from './config';

interface GenerateImageInput {
  prompt: string;
  model: string;
  size: string;
  quality: string;
}

interface GeneratedImage {
  b64Json?: string;
  url?: string;
  revisedPrompt?: string;
}

export async function generateImage(env: Env, input: GenerateImageInput): Promise<GeneratedImage> {
  const baseUrl = await getSetting(env, 'OPENAI_BASE_URL', env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1');
  const apiKey = await getSecret(env, 'OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: input.model,
      prompt: input.prompt,
      size: input.size,
      quality: input.quality,
      response_format: 'b64_json'
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI image API failed: ${response.status} ${text.slice(0, 500)}`);
  }

  const json = await response.json() as { data?: Array<{ b64_json?: string; url?: string; revised_prompt?: string }> };
  const first = json.data?.[0];
  if (!first) throw new Error('OpenAI image API returned no image');
  return { b64Json: first.b64_json, url: first.url, revisedPrompt: first.revised_prompt };
}
