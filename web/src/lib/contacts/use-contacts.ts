'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { Contact, ContactInput } from '@/lib/contacts/types';

async function fetchContacts(): Promise<Contact[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('contacts')
    .select('*')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('is_active', true)
    .order('sort_order')
    .order('name');
  if (error) throw error;
  return (data ?? []) as Contact[];
}

export function useContacts() {
  const queryClient = useQueryClient();
  const queryKey = ['contacts', DEFAULT_HOTEL_ID] as const;

  const query = useQuery({ queryKey, queryFn: fetchContacts });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('contacts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contacts', filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}` },
        () => queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createContact = useMutation({
    mutationFn: async (input: ContactInput) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('contacts')
        .insert({ ...input, hotel_id: DEFAULT_HOTEL_ID })
        .select('*')
        .single();
      if (error) throw error;
      return data as Contact;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateContact = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: ContactInput }) => {
      const supabase = createClient();
      const { data, error } = await supabase.from('contacts').update(input).eq('id', id).select('*').single();
      if (error) throw error;
      return data as Contact;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteContact = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('contacts').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const togglePin = useMutation({
    mutationFn: async ({ id, isPinned }: { id: string; isPinned: boolean }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('contacts')
        .update({ is_pinned: !isPinned })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as Contact;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    contacts: query.data ?? [],
    isLoading: query.isLoading,
    createContact,
    updateContact,
    deleteContact,
    togglePin,
  };
}

export function usePinnedContacts() {
  return useQuery({
    queryKey: ['contacts-pinned', DEFAULT_HOTEL_ID],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .eq('is_active', true)
        .eq('is_pinned', true)
        .order('sort_order')
        .limit(6);
      if (error) throw error;
      return (data ?? []) as Contact[];
    },
  });
}
