import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { Notice } from '@/lib/handover/types';

export type NoticeRead = {
  id: string;
  notice_id: string;
  staff_name: string;
  shift: string;
  read_at: string;
};

export async function markNoticeRead(noticeId: string, staffName: string, shift: string): Promise<void> {
  const name = staffName.trim();
  if (!name) return;

  const supabase = createClient();
  const { error } = await supabase.from('notice_reads').upsert(
    {
      hotel_id: DEFAULT_HOTEL_ID,
      notice_id: noticeId,
      staff_name: name,
      shift: shift || '',
      read_at: new Date().toISOString(),
    },
    { onConflict: 'notice_id,staff_name' },
  );

  if (error) {
    console.error('markNoticeRead failed', error.message);
  }
}

export async function fetchNoticeReads(noticeIds: string[]): Promise<NoticeRead[]> {
  if (!noticeIds.length) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from('notice_reads')
    .select('id, notice_id, staff_name, shift, read_at')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .in('notice_id', noticeIds)
    .order('read_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as NoticeRead[];
}

export function pinnedNotices(notices: Notice[]): Notice[] {
  return notices.filter((n) => n.is_pinned);
}

export function unreadPinnedCount(
  pinned: Notice[],
  reads: NoticeRead[],
  staffName: string,
): number {
  const name = staffName.trim();
  if (!name || !pinned.length) return 0;

  const readIds = new Set(
    reads.filter((r) => r.staff_name === name).map((r) => r.notice_id),
  );
  return pinned.filter((n) => !readIds.has(n.id)).length;
}

export function noticeReadSummary(
  noticeId: string,
  reads: NoticeRead[],
  activeStaffNames: string[],
): { read: string[]; unread: string[] } {
  const readSet = new Set(reads.filter((r) => r.notice_id === noticeId).map((r) => r.staff_name));
  const read = activeStaffNames.filter((name) => readSet.has(name));
  const unread = activeStaffNames.filter((name) => !readSet.has(name));
  return { read, unread };
}
