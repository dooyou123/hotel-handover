import { createHash, randomBytes } from 'crypto';

export const PARCEL_SIGN_TOKEN_TTL_MS = 30 * 60 * 1000;

export function generateDeliveryToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashDeliveryToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function parcelSignPath(token: string): string {
  return `/parcels/sign/${encodeURIComponent(token)}`;
}

export function buildParcelSignUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, '')}${parcelSignPath(token)}`;
}
