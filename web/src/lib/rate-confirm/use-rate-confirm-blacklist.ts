'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { tokenizeGuestName } from '@/lib/rate-confirm/blacklist-match';
import type {
  RateConfirmGuestBlacklistEntry,
  RateConfirmGuestBlacklistInput,
} from '@/lib/rate-confirm/blacklist-types';
import { createClient } from '@/lib/supabase/client';

const blacklistKey = ['rate-confirm-blacklist', DEFAULT_HOTEL_ID] as const;

async function fetchBlacklist(): Promise<RateConfirmGuestBlacklistEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('rate_confirm_guest_blacklist')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as RateConfirmGuestBlacklistEntry[];
}

export function useRateConfirmBlacklist(enabled = true) {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: blacklistKey,
    queryFn: fetchBlacklist,
    enabled,
  });

  const addEntry = useMutation({
    mutationFn: async (input: RateConfirmGuestBlacklistInput & { created_by: string }) => {
      const guestName = input.guest_name.trim();
      if (!guestName) throw new Error('고객명을 입력해 주세요.');
      if (!input.reason.trim()) throw new Error('등록 사유를 입력해 주세요.');

      const supabase = createClient();
      const { data, error } = await supabase
        .from('rate_confirm_guest_blacklist')
        .insert({
          hotel_id: DEFAULT_HOTEL_ID,
          guest_name: guestName,
          name_tokens: tokenizeGuestName(guestName),
          reason: input.reason.trim(),
          history_note: input.history_note?.trim() ?? '',
          phone: input.phone?.trim() ?? '',
          email: input.email?.trim() ?? '',
          notes: input.notes?.trim() ?? '',
          created_by: input.created_by,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as RateConfirmGuestBlacklistEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blacklistKey });
    },
  });

  const updateEntry = useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: Partial<RateConfirmGuestBlacklistInput> & { active?: boolean };
    }) => {
      const patch: Record<string, unknown> = {};
      if (input.guest_name !== undefined) {
        const guestName = input.guest_name.trim();
        if (!guestName) throw new Error('고객명을 입력해 주세요.');
        patch.guest_name = guestName;
        patch.name_tokens = tokenizeGuestName(guestName);
      }
      if (input.reason !== undefined) patch.reason = input.reason.trim();
      if (input.history_note !== undefined) patch.history_note = input.history_note.trim();
      if (input.phone !== undefined) patch.phone = input.phone.trim();
      if (input.email !== undefined) patch.email = input.email.trim();
      if (input.notes !== undefined) patch.notes = input.notes.trim();
      if (input.active !== undefined) patch.active = input.active;

      const supabase = createClient();
      const { data, error } = await supabase
        .from('rate_confirm_guest_blacklist')
        .update(patch)
        .eq('id', id)
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .select('*')
        .single();
      if (error) throw error;
      return data as RateConfirmGuestBlacklistEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blacklistKey });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('rate_confirm_guest_blacklist')
        .delete()
        .eq('id', id)
        .eq('hotel_id', DEFAULT_HOTEL_ID);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blacklistKey });
    },
  });

  return { listQuery, addEntry, updateEntry, deleteEntry };
}
