import type { Env } from '../types';

function b64ToBytes(value: string): Uint8Array {
  const raw = atob(value);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export async function saveGeneratedImage(env: Env, jobId: string, b64Json: string): Promise<string> {
  const key = `generated/${jobId}.png`;
  const body = b64ToBytes(b64Json);
  await env.IMAGES.put(key, body, {
    httpMetadata: { contentType: 'image/png' },
    customMetadata: { jobId }
  });
  return key;
}
