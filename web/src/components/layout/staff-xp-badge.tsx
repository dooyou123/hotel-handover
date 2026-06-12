'use client';

import { xpLevelProgress, xpLevelTitle } from '@/lib/staff/xp';
import { useStaffXp } from '@/lib/staff/use-staff-xp';

type StaffXpBadgeProps = {
  staffName: string;
};

export function StaffXpBadge({ staffName }: StaffXpBadgeProps) {
  const { data } = useStaffXp(staffName);
  if (!staffName.trim() || !data) return null;

  const progress = xpLevelProgress(data.xp);
  const pct = Math.min(100, Math.round((progress.inLevel / progress.toNext) * 100));

  return (
    <div
      className="staff-xp-badge"
      title={`${xpLevelTitle(progress.level)} · ${data.xp} XP · 다음 레벨까지 ${progress.toNext - progress.inLevel} XP`}
      aria-label={`레벨 ${progress.level}, 경험치 ${data.xp}`}
    >
      <span className="staff-xp-badge__level">Lv.{progress.level}</span>
      <span className="staff-xp-badge__bar" aria-hidden>
        <span className="staff-xp-badge__fill" style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}
