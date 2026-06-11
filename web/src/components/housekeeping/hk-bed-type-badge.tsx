import {
  hkBedTypeLabel,
  hkExtraBedActionLabel,
  hkGuestStatusLabel,
  type HkBedType,
  type HkExtraBedAction,
} from '@/lib/housekeeping/types';

type HkBedTypeBadgeProps = {
  type: HkBedType;
  size?: 'sm' | 'md' | 'lg';
  showUnset?: boolean;
};

export function HkBedTypeBadge({ type, size = 'md', showUnset = true }: HkBedTypeBadgeProps) {
  if (!type && !showUnset) return null;

  const label = type ? hkBedTypeLabel(type) : '미설정';
  const className = [
    'hk-type-badge',
    `hk-type-badge--${size}`,
    type === 'twin' ? 'hk-type-badge--twin' : '',
    type === 'triple' ? 'hk-type-badge--triple' : '',
    !type ? 'hk-type-badge--unset' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return <span className={className}>{label}</span>;
}

type HkBedTypeLetterProps = {
  type: HkBedType;
};

/** 맵·재실 패널용 — 트윈/트리플을 한눈에 구분 */
export function HkBedTypeLetter({ type }: HkBedTypeLetterProps) {
  const label = type === 'twin' ? '트윈' : type === 'triple' ? '트리플' : '?';
  const className = [
    'hk-type-letter',
    type === 'twin' ? 'hk-type-letter--twin' : '',
    type === 'triple' ? 'hk-type-letter--triple' : '',
    !type ? 'hk-type-letter--unset' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={className} aria-label={type ? hkBedTypeLabel(type) : '침대 구성 미설정'}>
      {label}
    </span>
  );
}

type HkGuestStatusBadgeProps = {
  status: string;
  size?: 'sm' | 'md';
};

export function HkGuestStatusBadge({ status, size = 'sm' }: HkGuestStatusBadgeProps) {
  if (!status) return null;

  const className = [
    'hk-guest-badge',
    `hk-guest-badge--${size}`,
    status === 'stay' ? 'hk-guest-badge--stay' : '',
    status === 'arrival' ? 'hk-guest-badge--arrival' : '',
    status === 'checkout' ? 'hk-guest-badge--checkout' : '',
    status === 'vacant' ? 'hk-guest-badge--vacant' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return <span className={className}>{hkGuestStatusLabel(status)}</span>;
}

type HkExtraBedBadgeProps = {
  action: HkExtraBedAction;
  size?: 'sm' | 'md';
};

export function HkExtraBedBadge({ action, size = 'sm' }: HkExtraBedBadgeProps) {
  if (!action) return null;

  const className = [
    'hk-eb-badge',
    `hk-eb-badge--${size}`,
    action === 'add' ? 'hk-eb-badge--add' : '',
    action === 'remove' ? 'hk-eb-badge--remove' : '',
    action === 'keep' ? 'hk-eb-badge--keep' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return <span className={className}>{hkExtraBedActionLabel(action)}</span>;
}
