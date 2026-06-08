'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { enrichAttachments, uploadCardAttachment, deleteCardAttachment as removeAttachment } from '@/lib/handover/attachments';
import { createClient } from '@/lib/supabase/client';
import type { Card, CardInput, ColumnId } from '@/lib/handover/types';

const CARD_SELECT = '*, card_acknowledgments(*), card_comments(*), card_attachments(*)';

function normalizeCard(row: Card): Card {
  return {
    ...row,
    archived_at: row.archived_at ?? null,
    linked_todo_id: row.linked_todo_id ?? null,
    card_acknowledgments: row.card_acknowledgments ?? [],
    card_comments: [...(row.card_comments ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    card_attachments: row.card_attachments ?? [],
  };
}

async function enrichCardList(cards: Card[]): Promise<Card[]> {
  return Promise.all(
    cards.map(async (card) => ({
      ...card,
      card_attachments: await enrichAttachments(card.card_attachments),
    })),
  );
}

async function fetchCards(): Promise<Card[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('cards')
    .select(CARD_SELECT)
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .is('archived_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;

  const cards = (data ?? []).map((row) => normalizeCard(row as Card));
  return enrichCardList(cards);
}

async function fetchArchivedCards(): Promise<Card[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('cards')
    .select(CARD_SELECT)
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false });

  if (error) throw error;

  const cards = (data ?? []).map((row) => normalizeCard(row as Card));
  return enrichCardList(cards);
}

function invalidateCardQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['cards', DEFAULT_HOTEL_ID] });
  queryClient.invalidateQueries({ queryKey: ['archived-cards', DEFAULT_HOTEL_ID] });
}

export function useCards() {
  const queryClient = useQueryClient();
  const queryKey = ['cards', DEFAULT_HOTEL_ID] as const;

  const query = useQuery({
    queryKey,
    queryFn: fetchCards,
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('handover-cards')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cards', filter: `hotel_id=eq.${DEFAULT_HOTEL_ID}` },
        () => invalidateCardQueries(queryClient),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'card_acknowledgments' }, () => {
        invalidateCardQueries(queryClient);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'card_comments' }, () => {
        invalidateCardQueries(queryClient);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'card_attachments' }, () => {
        invalidateCardQueries(queryClient);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const createCard = useMutation({
    mutationFn: async (input: CardInput) => {
      const supabase = createClient();
      const cards = queryClient.getQueryData<Card[]>(queryKey) ?? [];
      const sameColumn = cards.filter((card) => card.column_id === input.column_id);
      const sortOrder = sameColumn.length
        ? Math.max(...sameColumn.map((card) => card.sort_order)) + 1
        : 0;

      const { data, error } = await supabase
        .from('cards')
        .insert({ ...input, hotel_id: DEFAULT_HOTEL_ID, sort_order: sortOrder })
        .select(CARD_SELECT)
        .single();

      if (error) throw error;
      return normalizeCard(data as Card);
    },
    onSuccess: () => invalidateCardQueries(queryClient),
  });

  const updateCard = useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: Partial<CardInput> & { linked_todo_id?: string | null };
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('cards')
        .update(input)
        .eq('id', id)
        .select(CARD_SELECT)
        .single();

      if (error) throw error;
      return normalizeCard(data as Card);
    },
    onSuccess: () => invalidateCardQueries(queryClient),
  });

  const deleteCard = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('cards').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateCardQueries(queryClient),
  });

  const moveCard = useMutation({
    mutationFn: async ({
      cardId,
      columnId,
      orderedIds,
    }: {
      cardId: string;
      columnId: ColumnId;
      orderedIds: string[];
    }) => {
      const supabase = createClient();
      const updates = orderedIds.map((id, index) =>
        supabase
          .from('cards')
          .update({ column_id: columnId, sort_order: index })
          .eq('id', id),
      );

      if (!orderedIds.includes(cardId)) {
        throw new Error('카드 순서 갱신에 실패했습니다.');
      }

      const results = await Promise.all(updates);
      const failed = results.find((result) => result.error);
      if (failed?.error) throw failed.error;
    },
    onSuccess: () => invalidateCardQueries(queryClient),
  });

  const acknowledgeCard = useMutation({
    mutationFn: async ({ cardId, shift, staffName }: { cardId: string; shift: string; staffName: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from('card_acknowledgments').insert({
        card_id: cardId,
        shift,
        staff_name: staffName,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidateCardQueries(queryClient),
  });

  const addComment = useMutation({
    mutationFn: async ({
      cardId,
      shift,
      staffName,
      content,
    }: {
      cardId: string;
      shift: string;
      staffName: string;
      content: string;
    }) => {
      const supabase = createClient();
      const { error } = await supabase.from('card_comments').insert({
        card_id: cardId,
        shift,
        staff_name: staffName,
        content,
      });
      if (error) throw error;
      await supabase.from('cards').update({ updated_at: new Date().toISOString() }).eq('id', cardId);
    },
    onSuccess: () => invalidateCardQueries(queryClient),
  });

  const uploadAttachment = useMutation({
    mutationFn: async ({ cardId, file, existingCount }: { cardId: string; file: File; existingCount: number }) =>
      uploadCardAttachment(cardId, file, existingCount),
    onSuccess: () => invalidateCardQueries(queryClient),
  });

  const deleteAttachment = useMutation({
    mutationFn: async (attachment: Card['card_attachments'][number]) => removeAttachment(attachment),
    onSuccess: () => invalidateCardQueries(queryClient),
  });

  const archiveDone = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from('cards')
        .update({ archived_at: new Date().toISOString() })
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .eq('column_id', 'done')
        .is('archived_at', null);
      if (error) throw error;
    },
    onSuccess: () => invalidateCardQueries(queryClient),
  });

  const restoreFromArchive = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('cards').update({ archived_at: null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateCardQueries(queryClient),
  });

  return {
    cards: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createCard,
    updateCard,
    deleteCard,
    moveCard,
    acknowledgeCard,
    addComment,
    uploadAttachment,
    deleteAttachment,
    archiveDone,
    restoreFromArchive,
  };
}

export function useArchivedCards() {
  const queryClient = useQueryClient();
  const queryKey = ['archived-cards', DEFAULT_HOTEL_ID] as const;

  return useQuery({
    queryKey,
    queryFn: fetchArchivedCards,
  });
}

export function useIsManager() {
  return useQuery({
    queryKey: ['profile-role'],
    queryFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      return data?.role === 'manager';
    },
  });
}
