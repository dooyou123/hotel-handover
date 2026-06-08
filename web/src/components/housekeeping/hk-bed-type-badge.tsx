import { hkBedTypeLabel, hkExtraBedActionLabel, type HkBedType, type HkExtraBedAction } from '@/lib/housekeeping/types';

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
