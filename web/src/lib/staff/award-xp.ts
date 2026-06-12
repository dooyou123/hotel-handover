import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { type XpRewardKey, XP_REWARDS } from '@/lib/staff/xp';

export type AwardXpResult = {
  xp: number;
  level: number;
  leveledUp: boolean;
};

export async function awardStaffXp(
  staffName: string,
  reward: XpRewardKey | number,
): Promise<AwardXpResult | null> {
  const name = staffName.trim();
  if (!name) return null;

  const amount = typeof reward === 'number' ? reward : XP_REWARDS[reward];
  if (amount <= 0) return null;

  const supabase = createClient();
  const { data, error } = await supabase.rpc('award_staff_xp', {
    p_hotel_id: DEFAULT_HOTEL_ID,
    p_staff_name: name,
    p_amount: amount,
  });

  if (error) {
    console.error('award_staff_xp failed', error.message);
    return null;
  }

  const row = data as { xp?: number; level?: number; leveled_up?: boolean } | null;
  if (!row) return null;

  return {
    xp: row.xp ?? 0,
    level: row.level ?? 1,
    leveledUp: Boolean(row.leveled_up),
  };
}
