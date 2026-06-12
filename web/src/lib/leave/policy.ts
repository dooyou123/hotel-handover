import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { isLeaveSchemaMissing } from '@/lib/leave/schema';
import type { LeaveBlockedDate, LeavePolicy } from '@/lib/leave/types';

const DEFAULT_POLICY: LeavePolicy = {
  max_days_per_month: 4,
  max_staff_per_day: 2,
  apply_month_offset: 1,
  application_open_day: 1,
  application_close_day: 20,
};

export async function fetchLeavePolicy(hotelId = DEFAULT_HOTEL_ID): Promise<LeavePolicy> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('hotels')
    .select(
      'leave_max_days_per_month, leave_max_staff_per_day, leave_apply_month_offset, leave_application_open_day, leave_application_close_day',
    )
    .eq('id', hotelId)
    .maybeSingle();
  if (error) {
    if (isLeaveSchemaMissing(error)) return DEFAULT_POLICY;
    throw error;
  }
  if (!data) return DEFAULT_POLICY;
  return {
    max_days_per_month: data.leave_max_days_per_month ?? DEFAULT_POLICY.max_days_per_month,
    max_staff_per_day: data.leave_max_staff_per_day ?? DEFAULT_POLICY.max_staff_per_day,
    apply_month_offset: data.leave_apply_month_offset ?? DEFAULT_POLICY.apply_month_offset,
    application_open_day: data.leave_application_open_day ?? DEFAULT_POLICY.application_open_day,
    application_close_day: data.leave_application_close_day ?? DEFAULT_POLICY.application_close_day,
  };
}

export async function saveLeavePolicy(policy: LeavePolicy, hotelId = DEFAULT_HOTEL_ID): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('hotels')
    .update({
      leave_max_days_per_month: policy.max_days_per_month,
      leave_max_staff_per_day: policy.max_staff_per_day,
      leave_apply_month_offset: policy.apply_month_offset,
      leave_application_open_day: policy.application_open_day,
      leave_application_close_day: policy.application_close_day,
    })
    .eq('id', hotelId);
  if (error) throw error;
}

export async function fetchLeaveBlockedDates(hotelId = DEFAULT_HOTEL_ID): Promise<LeaveBlockedDate[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('leave_blocked_dates')
    .select('*')
    .eq('hotel_id', hotelId)
    .order('block_month')
    .order('block_day');
  if (error) {
    if (isLeaveSchemaMissing(error)) return [];
    throw error;
  }
  return (data ?? []) as LeaveBlockedDate[];
}

export async function addLeaveBlockedDate(
  input: { block_month: number; block_day: number; label: string },
  hotelId = DEFAULT_HOTEL_ID,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('leave_blocked_dates').insert({ ...input, hotel_id: hotelId });
  if (error) throw error;
}

export async function removeLeaveBlockedDate(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from('leave_blocked_dates').delete().eq('id', id);
  if (error) throw error;
}

export async function isLeaveSchemaReady(hotelId = DEFAULT_HOTEL_ID): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('hotels')
    .select('leave_max_days_per_month')
    .eq('id', hotelId)
    .maybeSingle();
  if (isLeaveSchemaMissing(error)) return false;
  if (error) throw error;
  return true;
}
