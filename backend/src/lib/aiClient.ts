import { env } from '../config/env.js';

export async function checkAiHealth(): Promise<'up' | 'down'> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);

  try {
    const url = new URL('/healthz', env.AI_SERVICE_URL).toString();
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok ? 'up' : 'down';
  } catch {
    clearTimeout(timeoutId);
    return 'down';
  }
}
