import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

const MIN_PIN_LENGTH = 4;
const MAX_PIN_LENGTH = 12;

export function normalizePartyPin(pin: string): string {
  return pin.normalize('NFKC').trim();
}

export function validatePartyPin(pin: string): string | null {
  const value = normalizePartyPin(pin);
  if (value.length < MIN_PIN_LENGTH) return `비밀번호는 ${MIN_PIN_LENGTH}자 이상이어야 합니다.`;
  if (value.length > MAX_PIN_LENGTH) return `비밀번호는 ${MAX_PIN_LENGTH}자 이하여야 합니다.`;
  if (/\s/.test(value)) return '비밀번호에 공백을 넣을 수 없습니다.';
  return null;
}

export function hashPartyPin(pin: string): string {
  const normalized = normalizePartyPin(pin);
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(normalized, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPartyPin(pin: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const [algo, salt, hash] = stored.split('$');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  try {
    const next = scryptSync(normalizePartyPin(pin), salt, 64);
    const prev = Buffer.from(hash, 'hex');
    if (next.length !== prev.length) return false;
    return timingSafeEqual(next, prev);
  } catch {
    return false;
  }
}
