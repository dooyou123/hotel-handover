'use client';

import { useQuery } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { xpToLevel } from '@/lib/staff/xp';

export type StaffXpRow = {
  staff_name: string;
  xp: number;
  level: number;
};

async function fetchStaffXp(staffName: string): Promise<StaffXpRow | null> {
  const name = staffName.trim();
  if (!name) return null;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('staff_xp')
    .select('staff_name, xp')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('staff_name', name)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { staff_name: name, xp: 0, level: 1 };

  const xp = data.xp ?? 0;
  return { staff_name: data.staff_name, xp, level: xpToLevel(xp) };
}

export function useStaffXp(staffName: string) {
  return useQuery({
    queryKey: ['staff-xp', DEFAULT_HOTEL_ID, staffName.trim()],
    queryFn: () => fetchStaffXp(staffName),
    enabled: Boolean(staffName.trim()),
    staleTime: 30_000,
  });
}
