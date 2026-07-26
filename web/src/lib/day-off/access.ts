import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';

export const DAY_OFF_COOKIE = 'day_off_access';
export const DAY_OFF_TTL_MS = 10 * 60 * 60 * 1000;
export const DAY_OFF_COOKIE_MAX_AGE = Math.floor(DAY_OFF_TTL_MS / 1000);

export type DayOffSessionPayload = {
  hotelId: string;
  exp: number;
  v: 1;
};

function getDayOffSecret(): string {
  const dedicated = process.env.DAY_OFF_ACCESS_SECRET?.trim();
  if (dedicated) return dedicated;
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (fallback && !fallback.includes('your-service-role-key')) return fallback;
  return '';
}

export function hasDayOffSecret(): boolean {
  return Boolean(getDayOffSecret());
}

export function hashAccessPin(pin: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pin.normalize('NFKC'), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyAccessPin(pin: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [algo, salt, hash] = stored.split('$');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  try {
    const next = scryptSync(pin.normalize('NFKC'), salt, 64);
    const prev = Buffer.from(hash, 'hex');
    if (next.length !== prev.length) return false;
    return timingSafeEqual(next, prev);
  } catch {
    return false;
  }
}

export function signDayOffSession(
  payload: Omit<DayOffSessionPayload, 'v' | 'exp'> & { exp?: number },
): string {
  const secret = getDayOffSecret();
  if (!secret) throw new Error('DAY_OFF_ACCESS_SECRET 또는 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.');
  const full: DayOffSessionPayload = {
    hotelId: payload.hotelId || DEFAULT_HOTEL_ID,
    exp: payload.exp ?? Date.now() + DAY_OFF_TTL_MS,
    v: 1,
  };
  const body = Buffer.from(JSON.stringify(full), 'utf8').toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyDayOffSession(token: string | undefined | null): DayOffSessionPayload | null {
  if (!token) return null;
  const secret = getDayOffSecret();
  if (!secret) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as DayOffSessionPayload;
    if (payload.v !== 1 || !payload.hotelId || typeof payload.exp !== 'number') return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

type RateLimitBucket = { count: number; resetAt: number };

const pinAttempts = new Map<string, RateLimitBucket>();
const PIN_LIMIT = 8;
const PIN_WINDOW_MS = 15 * 60 * 1000;

export function checkDayOffPinRateLimit(key: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const bucket = pinAttempts.get(key);
  if (!bucket || bucket.resetAt <= now) {
    pinAttempts.set(key, { count: 1, resetAt: now + PIN_WINDOW_MS });
    return { ok: true };
  }
  if (bucket.count >= PIN_LIMIT) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true };
}

export function clearDayOffPinRateLimit(key: string) {
  pinAttempts.delete(key);
}

export function dayOffCookieOptions(maxAge = DAY_OFF_COOKIE_MAX_AGE) {
  return {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export function isValidAccessPinPlain(pin: string): boolean {
  const trimmed = pin.trim();
  return trimmed.length >= 4 && trimmed.length <= 64;
}
