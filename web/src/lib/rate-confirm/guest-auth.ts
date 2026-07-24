import { createHash, createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'crypto';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';

export const RC_GUEST_COOKIE = 'rc_guest';
export const RC_GUEST_TTL_MS = 10 * 60 * 60 * 1000;
export const RC_GUEST_COOKIE_MAX_AGE = Math.floor(RC_GUEST_TTL_MS / 1000);

export type GuestSessionPayload = {
  hotelId: string;
  exp: number;
  v: 1;
};

function getGuestSecret(): string {
  const dedicated = process.env.RATE_CONFIRM_GUEST_SECRET?.trim();
  if (dedicated) return dedicated;
  const fallback = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (fallback && !fallback.includes('your-service-role-key')) return fallback;
  return '';
}

export function hasGuestSecret(): boolean {
  return Boolean(getGuestSecret());
}

export function hashGuestPin(pin: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pin.normalize('NFKC'), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyGuestPin(pin: string, stored: string | null | undefined): boolean {
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

export function signGuestSession(
  payload: Omit<GuestSessionPayload, 'v' | 'exp'> & { exp?: number },
): string {
  const secret = getGuestSecret();
  if (!secret) throw new Error('RATE_CONFIRM_GUEST_SECRET 또는 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.');
  const full: GuestSessionPayload = {
    hotelId: payload.hotelId || DEFAULT_HOTEL_ID,
    exp: payload.exp ?? Date.now() + RC_GUEST_TTL_MS,
    v: 1,
  };
  const body = Buffer.from(JSON.stringify(full), 'utf8').toString('base64url');
  const sig = createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyGuestSession(token: string | undefined | null): GuestSessionPayload | null {
  if (!token) return null;
  const secret = getGuestSecret();
  if (!secret) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', secret).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as GuestSessionPayload;
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

export function checkPinRateLimit(key: string): { ok: true } | { ok: false; retryAfterSec: number } {
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

export function clearPinRateLimit(key: string) {
  pinAttempts.delete(key);
}

export function guestCookieOptions(maxAge = RC_GUEST_COOKIE_MAX_AGE) {
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

export function isValidGuestPinPlain(pin: string): boolean {
  const trimmed = pin.trim();
  return trimmed.length >= 4 && trimmed.length <= 32;
}

export const RC_GUEST_OTP_TTL_MS = 15 * 60 * 1000;

export function normalizeGuestEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidGuestEmail(email: string): boolean {
  const normalized = normalizeGuestEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) && normalized.length <= 160;
}

export function generateGuestOtpCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashGuestOtp(code: string): string {
  return createHash('sha256').update(code.normalize('NFKC')).digest('hex');
}

export function verifyGuestOtpHash(code: string, storedHash: string): boolean {
  const next = Buffer.from(hashGuestOtp(code), 'hex');
  const prev = Buffer.from(storedHash, 'hex');
  if (next.length !== prev.length) return false;
  return timingSafeEqual(next, prev);
}

export function parseGuestEmailAllowlist(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const email = normalizeGuestEmail(item);
    if (isValidGuestEmail(email) && !out.includes(email)) out.push(email);
  }
  return out;
}

const otpSendAttempts = new Map<string, RateLimitBucket>();
const OTP_SEND_LIMIT = 5;
const OTP_SEND_WINDOW_MS = 15 * 60 * 1000;

export function checkOtpSendRateLimit(key: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const bucket = otpSendAttempts.get(key);
  if (!bucket || bucket.resetAt <= now) {
    otpSendAttempts.set(key, { count: 1, resetAt: now + OTP_SEND_WINDOW_MS });
    return { ok: true };
  }
  if (bucket.count >= OTP_SEND_LIMIT) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true };
}
