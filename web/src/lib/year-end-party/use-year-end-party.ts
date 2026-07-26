'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type {
  PartyDateSlot,
  PartyDateVote,
  PartyDietary,
  PartyEmployee,
  PartyEmployeeInput,
  PartyRank,
  PartyBallotRanks,
  PartyAvailability,
  PartySettings,
  PartyVenue,
  PartyVenueInput,
  PartyVenueVote,
} from '@/lib/year-end-party/types';

const KEY = {
  settings: ['party-settings', DEFAULT_HOTEL_ID] as const,
  employees: ['party-employees', DEFAULT_HOTEL_ID] as const,
  venues: ['party-venues', DEFAULT_HOTEL_ID] as const,
  venueVotes: ['party-venue-votes', DEFAULT_HOTEL_ID] as const,
  slots: ['party-date-slots', DEFAULT_HOTEL_ID] as const,
  dateVotes: ['party-date-votes', DEFAULT_HOTEL_ID] as const,
  dietary: ['party-dietary', DEFAULT_HOTEL_ID] as const,
};

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  Object.values(KEY).forEach((key) => qc.invalidateQueries({ queryKey: key }));
}

function usePartyRealtime(tables: string[], queryKeys: ReadonlyArray<readonly string[]>) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`year-end-party-${tables.join('-')}`);
    for (const table of tables) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}` },
        () => {
          for (const key of queryKeys) {
            queryClient.invalidateQueries({ queryKey: key });
          }
        },
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, tables.join('|'), queryKeys.map((key) => key.join('.')).join('|')]);
}

const SETTINGS_SELECT =
  'hotel_id, subsidy_per_person, headcount_override, confirmed_venue_id, confirmed_slot_id, invitation_draft, vote_opens_at, vote_deadline_at, results_published_at, updated_at';

export function usePartySettings() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: KEY.settings,
    queryFn: async (): Promise<PartySettings> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('party_settings')
        .select(SETTINGS_SELECT)
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as PartySettings;
      const { data: created, error: insertError } = await supabase
        .from('party_settings')
        .insert({ hotel_id: DEFAULT_HOTEL_ID })
        .select(SETTINGS_SELECT)
        .single();
      if (insertError) throw insertError;
      return created as PartySettings;
    },
  });

  usePartyRealtime(['party_settings'], [KEY.settings]);

  const saveSettings = useMutation({
    mutationFn: async (patch: Partial<PartySettings>) => {
      const supabase = createClient();
      const { data: existing } = await supabase
        .from('party_settings')
        .select('hotel_id')
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .maybeSingle();
      if (!existing) {
        const { data, error } = await supabase
          .from('party_settings')
          .insert({ hotel_id: DEFAULT_HOTEL_ID, ...patch })
          .select(SETTINGS_SELECT)
          .single();
        if (error) throw error;
        return data as PartySettings;
      }
      const { data, error } = await supabase
        .from('party_settings')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .select(SETTINGS_SELECT)
        .single();
      if (error) throw error;
      return data as PartySettings;
    },
    onSuccess: (data) => queryClient.setQueryData(KEY.settings, data),
  });

  return { settings: query.data, isLoading: query.isLoading, saveSettings };
}

export function usePartyEmployees() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: KEY.employees,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('party_employees')
        .select('*')
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .order('sort_order')
        .order('name');
      if (error) throw error;
      return (data ?? []) as PartyEmployee[];
    },
  });

  usePartyRealtime(['party_employees'], [KEY.employees]);

  const saveEmployee = useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: PartyEmployeeInput }) => {
      const supabase = createClient();
      const payload = {
        hotel_id: DEFAULT_HOTEL_ID,
        name: input.name.trim(),
        department: input.department?.trim() ?? '',
        title: input.title?.trim() ?? '',
        attending: input.attending ?? true,
        memo: input.memo?.trim() ?? '',
      };
      if (id) {
        const { data, error } = await supabase
          .from('party_employees')
          .update(payload)
          .eq('id', id)
          .select('*')
          .single();
        if (error) throw error;
        return data as PartyEmployee;
      }
      const maxOrder = Math.max(0, ...(query.data ?? []).map((row) => row.sort_order));
      const { data, error } = await supabase
        .from('party_employees')
        .insert({ ...payload, sort_order: maxOrder + 1 })
        .select('*')
        .single();
      if (error) throw error;
      return data as PartyEmployee;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY.employees }),
  });

  const bulkAddEmployees = useMutation({
    mutationFn: async (names: string[]) => {
      const supabase = createClient();
      const existing = new Set((query.data ?? []).map((row) => row.name));
      const unique = names
        .map((name) => name.trim())
        .filter((name) => name && !existing.has(name));
      if (!unique.length) return 0;
      const maxOrder = Math.max(0, ...(query.data ?? []).map((row) => row.sort_order));
      const rows = unique.map((name, index) => ({
        hotel_id: DEFAULT_HOTEL_ID,
        name,
        sort_order: maxOrder + index + 1,
        attending: true,
      }));
      const { error } = await supabase.from('party_employees').insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY.employees }),
  });

  const deleteEmployee = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('party_employees').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY.employees }),
  });

  const deleteAllEmployees = useMutation({
    mutationFn: async (password: string) => {
      const supabase = createClient();
      const { data: settings, error: settingsError } = await supabase
        .from('party_settings')
        .select('admin_password')
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .maybeSingle();
      if (settingsError) throw settingsError;
      const expected = settings?.admin_password || 'party2026';
      if (password !== expected) throw new Error('관리자 비밀번호가 올바르지 않습니다.');
      const { error } = await supabase
        .from('party_employees')
        .delete()
        .eq('hotel_id', DEFAULT_HOTEL_ID);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY.employees }),
  });

  const moveEmployee = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: 'up' | 'down' }) => {
      const list = [...(query.data ?? [])].sort((a, b) => a.sort_order - b.sort_order);
      const index = list.findIndex((row) => row.id === id);
      if (index < 0) return;
      const swapWith = direction === 'up' ? index - 1 : index + 1;
      if (swapWith < 0 || swapWith >= list.length) return;
      const a = list[index]!;
      const b = list[swapWith]!;
      const supabase = createClient();
      const { error: e1 } = await supabase
        .from('party_employees')
        .update({ sort_order: b.sort_order })
        .eq('id', a.id);
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from('party_employees')
        .update({ sort_order: a.sort_order })
        .eq('id', b.id);
      if (e2) throw e2;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY.employees }),
  });

  return {
    employees: query.data ?? [],
    isLoading: query.isLoading,
    saveEmployee,
    bulkAddEmployees,
    deleteEmployee,
    deleteAllEmployees,
    moveEmployee,
  };
}

export function usePartyVenues() {
  const queryClient = useQueryClient();
  const venuesQuery = useQuery({
    queryKey: KEY.venues,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('party_venues')
        .select('*')
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .order('sort_order')
        .order('name');
      if (error) throw error;
      return (data ?? []) as PartyVenue[];
    },
  });
  const votesQuery = useQuery({
    queryKey: KEY.venueVotes,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('party_venue_votes')
        .select('*')
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as PartyVenueVote[];
    },
  });

  usePartyRealtime(['party_venues', 'party_venue_votes'], [KEY.venues, KEY.venueVotes]);

  const saveVenue = useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: PartyVenueInput }) => {
      const supabase = createClient();
      const payload = { ...input, hotel_id: DEFAULT_HOTEL_ID };
      if (id) {
        const { data, error } = await supabase
          .from('party_venues')
          .update(payload)
          .eq('id', id)
          .select('*')
          .single();
        if (error) throw error;
        return data as PartyVenue;
      }
      const { data, error } = await supabase.from('party_venues').insert(payload).select('*').single();
      if (error) throw error;
      return data as PartyVenue;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY.venues }),
  });

  const deleteVenue = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('party_venues').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateAll(queryClient),
  });

  const upsertVote = useMutation({
    mutationFn: async (input: {
      venue_id: string;
      voter_name: string;
      rank: PartyRank;
      comment?: string;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('party_venue_votes')
        .upsert(
          {
            hotel_id: DEFAULT_HOTEL_ID,
            venue_id: input.venue_id,
            voter_name: input.voter_name.trim(),
            rank: input.rank,
            comment: input.comment?.trim() ?? '',
          },
          { onConflict: 'hotel_id,voter_name,venue_id' },
        )
        .select('*')
        .single();
      if (error) throw error;
      return data as PartyVenueVote;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY.venueVotes }),
  });

  const saveBallot = useMutation({
    mutationFn: async (input: {
      voter_name: string;
      ranks: PartyBallotRanks;
      dateVotes: Array<{ slot_id: string; availability: PartyAvailability }>;
      pin: string;
      pin_confirm?: string;
      new_pin?: string;
    }) => {
      const res = await fetch('/api/year-end-party/ballot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'save', ...input }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error || '투표 저장에 실패했습니다.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY.venueVotes });
      queryClient.invalidateQueries({ queryKey: KEY.dateVotes });
    },
  });

  const unlockBallot = useMutation({
    mutationFn: async (input: { voter_name: string; pin: string }) => {
      const res = await fetch('/api/year-end-party/ballot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'unlock', ...input }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        unlocked?: boolean;
        legacy?: boolean;
        message?: string;
        ranks?: PartyBallotRanks;
        dateVotes?: Record<string, PartyAvailability | ''>;
      } | null;
      if (!res.ok || !json?.unlocked) {
        throw new Error(json?.error || '잠금 해제에 실패했습니다.');
      }
      return json as {
        unlocked: true;
        legacy: boolean;
        message?: string;
        ranks: PartyBallotRanks;
        dateVotes: Record<string, PartyAvailability | ''>;
      };
    },
  });

  const deleteVote = useMutation({
    mutationFn: async (input: { venue_id: string; voter_name: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('party_venue_votes')
        .delete()
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .eq('venue_id', input.venue_id)
        .eq('voter_name', input.voter_name.trim());
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY.venueVotes }),
  });

  const clearBallot = useMutation({
    mutationFn: async (input: { voter_name: string; pin: string }) => {
      const res = await fetch('/api/year-end-party/ballot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'clear', ...input }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(json?.error || '투표 철회에 실패했습니다.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY.venueVotes });
      queryClient.invalidateQueries({ queryKey: KEY.dateVotes });
    },
  });

  return {
    venues: venuesQuery.data ?? [],
    votes: votesQuery.data ?? [],
    isLoading: venuesQuery.isLoading || votesQuery.isLoading,
    saveVenue,
    deleteVenue,
    upsertVote,
    saveBallot,
    unlockBallot,
    deleteVote,
    clearBallot,
  };
}

export function usePartySchedule() {
  const queryClient = useQueryClient();
  const slotsQuery = useQuery({
    queryKey: KEY.slots,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('party_date_slots')
        .select('*')
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .order('slot_date')
        .order('slot_time');
      if (error) throw error;
      return (data ?? []) as PartyDateSlot[];
    },
  });
  const votesQuery = useQuery({
    queryKey: KEY.dateVotes,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('party_date_votes')
        .select('*')
        .eq('hotel_id', DEFAULT_HOTEL_ID);
      if (error) throw error;
      return (data ?? []) as PartyDateVote[];
    },
  });

  usePartyRealtime(['party_date_slots', 'party_date_votes'], [KEY.slots, KEY.dateVotes]);

  const saveSlot = useMutation({
    mutationFn: async (input: { slot_date: string; slot_time: string; label?: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('party_date_slots')
        .insert({
          hotel_id: DEFAULT_HOTEL_ID,
          slot_date: input.slot_date,
          slot_time: input.slot_time,
          label: input.label?.trim() ?? '',
        })
        .select('*')
        .single();
      if (error) throw error;
      return data as PartyDateSlot;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY.slots }),
  });

  const deleteSlot = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('party_date_slots').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY.slots });
      queryClient.invalidateQueries({ queryKey: KEY.dateVotes });
    },
  });

  const upsertDateVote = useMutation({
    mutationFn: async (input: {
      slot_id: string;
      voter_name: string;
      availability: PartyAvailability;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('party_date_votes')
        .upsert(
          {
            hotel_id: DEFAULT_HOTEL_ID,
            slot_id: input.slot_id,
            voter_name: input.voter_name.trim(),
            availability: input.availability,
          },
          { onConflict: 'hotel_id,slot_id,voter_name' },
        )
        .select('*')
        .single();
      if (error) throw error;
      return data as PartyDateVote;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY.dateVotes }),
  });

  const deleteDateVote = useMutation({
    mutationFn: async (input: { slot_id: string; voter_name: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('party_date_votes')
        .delete()
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .eq('slot_id', input.slot_id)
        .eq('voter_name', input.voter_name.trim());
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY.dateVotes }),
  });

  return {
    slots: slotsQuery.data ?? [],
    votes: votesQuery.data ?? [],
    isLoading: slotsQuery.isLoading || votesQuery.isLoading,
    saveSlot,
    deleteSlot,
    upsertDateVote,
    deleteDateVote,
  };
}

export function usePartyDietary() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: KEY.dietary,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('party_dietary')
        .select('*')
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .order('employee_name');
      if (error) throw error;
      return (data ?? []) as PartyDietary[];
    },
  });

  usePartyRealtime(['party_dietary'], [KEY.dietary]);

  const saveDietary = useMutation({
    mutationFn: async (input: {
      employee_name: string;
      restricted_foods: string;
      allergies: string;
      drinks_alcohol: boolean;
      notes: string;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('party_dietary')
        .upsert(
          {
            hotel_id: DEFAULT_HOTEL_ID,
            employee_name: input.employee_name.trim(),
            restricted_foods: input.restricted_foods.trim(),
            allergies: input.allergies.trim(),
            drinks_alcohol: input.drinks_alcohol,
            notes: input.notes.trim(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'hotel_id,employee_name' },
        )
        .select('*')
        .single();
      if (error) throw error;
      return data as PartyDietary;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY.dietary }),
  });

  const deleteDietary = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('party_dietary').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY.dietary }),
  });

  return { dietary: query.data ?? [], isLoading: query.isLoading, saveDietary, deleteDietary };
}
