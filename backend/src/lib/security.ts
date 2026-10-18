import argon2 from 'argon2';
import crypto from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { env } from '../config/env.js';

const PAIRING_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const secretKey = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = argon2.hash('dummy_timing_protection_password_128', {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  }
  return dummyHashPromise;
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export async function dummyVerifyPassword(): Promise<void> {
  try {
    const hash = await getDummyHash();
    await argon2.verify(hash, 'dummy_timing_protection_password_128');
  } catch {
    // Ignore error
  }
}

export async function generateAccessToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secretKey);
}

export async function verifyAccessToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    });
    if (!payload.sub) return null;
    return { userId: payload.sub };
  } catch {
    return null;
  }
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generatePairingCode(): string {
  const bytes = crypto.randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    const index = (bytes[i] ?? 0) % PAIRING_CHARS.length;
    code += PAIRING_CHARS[index];
  }
  return code;
}

export function generateDeviceToken(): string {
  return 'atn_' + crypto.randomBytes(32).toString('base64url');
}
