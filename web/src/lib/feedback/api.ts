import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';

export type FeedbackCategory = 'bug' | 'feature' | 'other';
export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export type UserFeedback = {
  id: string;
  hotel_id: string;
  reporter_user_id: string | null;
  reporter_shift: string;
  reporter_group: string;
  reporter_name: string;
  category: FeedbackCategory;
  page_path: string;
  subject: string;
  body: string;
  status: FeedbackStatus;
  admin_notes: string;
  created_at: string;
  updated_at: string;
};

export async function submitFeedback(params: {
  category: FeedbackCategory;
  subject: string;
  body: string;
  pagePath: string;
  reporterShift: string;
  reporterGroup: string;
  reporterName: string;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('user_feedback')
    .insert({
      hotel_id: DEFAULT_HOTEL_ID,
      reporter_user_id: user?.id ?? null,
      reporter_shift: params.reporterShift,
      reporter_group: params.reporterGroup,
      reporter_name: params.reporterName,
      category: params.category,
      page_path: params.pagePath,
      subject: params.subject.trim(),
      body: params.body.trim(),
    })
    .select()
    .single();

  if (error) throw error;
  return data as UserFeedback;
}

export async function fetchFeedbackList() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_feedback')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data ?? []) as UserFeedback[];
}

export async function updateFeedback(params: {
  id: string;
  status: FeedbackStatus;
  adminNotes: string;
}) {
  const supabase = createClient();
  const { error } = await supabase
    .from('user_feedback')
    .update({
      status: params.status,
      admin_notes: params.adminNotes.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.id);

  if (error) throw error;
}

export function subscribeFeedbackChanges(onChange: () => void) {
  const supabase = createClient();
  const channel = supabase
    .channel(`feedback-${DEFAULT_HOTEL_ID}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_feedback',
        filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}`,
      },
      () => onChange(),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function countOpenFeedback(items: UserFeedback[]) {
  return items.filter((item) => item.status === 'open' || item.status === 'in_progress').length;
}

export function isFeedbackDone(status: FeedbackStatus): boolean {
  return status === 'resolved' || status === 'closed';
}

export function sortFeedbackForAdmin(items: UserFeedback[]): UserFeedback[] {
  const rank: Record<FeedbackStatus, number> = {
    open: 0,
    in_progress: 1,
    resolved: 2,
    closed: 3,
  };
  return [...items].sort((a, b) => {
    const byStatus = rank[a.status] - rank[b.status];
    if (byStatus !== 0) return byStatus;
    return b.created_at.localeCompare(a.created_at);
  });
}
