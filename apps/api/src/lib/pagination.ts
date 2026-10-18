import { AppError } from './errors.js';

export interface KeysetCursor {
  time: string;
  id: string;
}

export function encodeCursor(cursor: KeysetCursor): string {
  const json = JSON.stringify(cursor);
  return Buffer.from(json, 'utf8').toString('base64url');
}

export function decodeCursor(encoded: string): KeysetCursor {
  try {
    const json = Buffer.from(encoded, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as { time?: unknown; timestamp?: unknown; id?: unknown };
    const timeVal = parsed.time ?? parsed.timestamp;
    if (typeof timeVal !== 'string' || typeof parsed.id !== 'string') {
      throw new Error('Malformed cursor fields');
    }
    const date = new Date(timeVal);
    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid cursor timestamp');
    }
    return { time: timeVal, id: parsed.id };
  } catch {
    throw AppError.validation('Invalid or malformed cursor');
  }
}
