'use client';

import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import {
  enrichAttachments,
  uploadCardAttachment,
  replaceCardAttachment,
  deleteCardAttachment as removeAttachment,
} from '@/lib/handover/attachments';
import { createClient } from '@/lib/supabase/client';
import { getSafeUser } from '@/lib/supabase/auth-session';
import { invalidateCardQueries } from '@/lib/supabase/handover-realtime';
import { planThreadLink } from '@/lib/handover/card-thread';
import { sanitizeChecklist } from '@/lib/handover/checklist';
import type { Card, CardInput, ColumnId } from '@/lib/handover/types';

const CARD_SELECT = '*, card_acknowledgments(*), card_comments(*), card_attachments(*)';

function normalizeCard(row: Card): Card {
  return {
    ...row,
    archived_at: row.archived_at ?? null,
    linked_todo_id: row.linked_todo_id ?? null,
    thread_id: row.thread_id ?? null,
    pinned_at: row.pinned_at ?? null,
    deleted_at: row.deleted_at ?? null,
    deleted_by: row.deleted_by ?? null,
    checklist: sanitizeChecklist(row.checklist),
    complaint_remedies: row.complaint_remedies ?? [],
    complaint_remedy_other: row.complaint_remedy_other ?? '',
    card_acknowledgments: row.card_acknowledgments ?? [],
    card_comments: [...(row.card_comments ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)),
    card_attachments: row.card_attachments ?? [],
  };
}

function enrichCardList(cards: Card[]): Card[] {
  return cards.map((card) => ({
    ...card,
    card_attachments: enrichAttachments(card.card_attachments),
  }));
}

/** 마이그레이션(102) 적용 전이면 deleted_at 열이 없다 — 필터 없이 재시도하기 위한 판별 */
function isMissingTrashColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42703' && /deleted_at/i.test(error.message ?? '');
}

export async function fetchCards(): Promise<Card[]> {
  const supabase = createClient();
  const run = (excludeTrash: boolean) => {
    let query = supabase
      .from('cards')
      .select(CARD_SELECT)
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .is('archived_at', null);
    if (excludeTrash) query = query.is('deleted_at', null);
    return query.order('sort_order', { ascending: true }).order('created_at', { ascending: true });
  };

  let { data, error } = await run(true);
  if (error && isMissingTrashColumn(error)) ({ data, error } = await run(false));
  if (error) throw error;

  const cards = (data ?? []).map((row) => normalizeCard(row as Card));
  return enrichCardList(cards);
}

export type ArchivedCardsFilter = {
  /** 이 시각 이후 보관된 것만 (null/미지정 = 전체 기간) */
  since?: string | null;
  /** 서버측 텍스트 검색 — 전체 보관 기록을 대상으로 한다 */
  search?: string;
  dateFrom?: string | null;
  dateTo?: string | null;
};

export async function fetchArchivedCards(filter: ArchivedCardsFilter = {}): Promise<Card[]> {
  const supabase = createClient();
  const run = (excludeTrash: boolean) => {
    let query = supabase
      .from('cards')
      .select(CARD_SELECT)
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .not('archived_at', 'is', null);
    if (excludeTrash) query = query.is('deleted_at', null);

    if (filter.since) query = query.gte('archived_at', filter.since);

    // PostgREST or() 문법과 충돌하는 문자는 공백으로 치환
    const term = (filter.search ?? '').replace(/[,%_()]/g, ' ').trim();
    if (term) {
      const pattern = `%${term}%`;
      const conditions = [
        `title.ilike.${pattern}`,
        `room.ilike.${pattern}`,
        `details.ilike.${pattern}`,
        `resolution.ilike.${pattern}`,
        `next_action.ilike.${pattern}`,
        `category.ilike.${pattern}`,
        `author.ilike.${pattern}`,
        `assignee_name.ilike.${pattern}`,
      ];
      const numeric = /^#?(\d+)$/.exec(term);
      if (numeric) conditions.push(`handover_no.eq.${numeric[1]}`);
      query = query.or(conditions.join(','));
    }

    if (filter.dateFrom) query = query.gte('created_at', filter.dateFrom);
    if (filter.dateTo) query = query.lte('created_at', `${filter.dateTo}T23:59:59`);

    return query.order('archived_at', { ascending: false });
  };

  let { data, error } = await run(true);
  if (error && isMissingTrashColumn(error)) ({ data, error } = await run(false));
  if (error) throw error;

  const cards = (data ?? []).map((row) => normalizeCard(row as Card));
  return enrichCardList(cards);
}

function invalidateCardQueriesLocal(queryClient: ReturnType<typeof useQueryClient>) {
  invalidateCardQueries(queryClient);
}

export function useCards() {
  const queryClient = useQueryClient();
  const queryKey = ['cards', DEFAULT_HOTEL_ID] as const;

  const query = useQuery({
    queryKey,
    queryFn: fetchCards,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
  });

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
    onSuccess: () => invalidateCardQueriesLocal(queryClient),
  });

  const updateCard = useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: Partial<CardInput> & {
        linked_todo_id?: string | null;
        snoozed_until?: string | null;
        first_response_at?: string | null;
      };
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
    onSuccess: () => invalidateCardQueriesLocal(queryClient),
  });

  // 삭제 = 휴지통 이동(소프트 삭제). RPC(102 적용 후)가 deleted_at을 기록한다.
  const deleteCard = useMutation({
    mutationFn: async ({ id, staffName }: { id: string; staffName: string }) => {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc('delete_card_by_staff', {
        p_card_id: id,
        p_staff_name: staffName,
      });
      if (!rpcError) return;

      if (rpcError.code === 'PGRST202') {
        // RPC가 없는 환경 — 직접 소프트 삭제 시도, 열도 없으면 기존처럼 하드 삭제
        const { error: softError } = await supabase
          .from('cards')
          .update({ deleted_at: new Date().toISOString(), deleted_by: staffName || null })
          .eq('id', id);
        if (!softError) return;
        if (!isMissingTrashColumn(softError)) throw softError;
        const { error: directError } = await supabase.from('cards').delete().eq('id', id);
        if (directError) throw directError;
        return;
      }

      throw rpcError;
    },
    onSuccess: () => {
      invalidateCardQueriesLocal(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['trashed-cards', DEFAULT_HOTEL_ID] });
      void queryClient.invalidateQueries({ queryKey: ['trashed-cards-count', DEFAULT_HOTEL_ID] });
    },
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
    onSuccess: () => invalidateCardQueriesLocal(queryClient),
  });

  const acknowledgeCard = useMutation({
    mutationFn: async ({ cardId, shift, staffName }: { cardId: string; shift: string; staffName: string }) => {
      const supabase = createClient();
      const name = staffName.trim();
      if (!name) throw new Error('담당자를 선택해 주세요.');

      const { data: existing } = await supabase
        .from('card_acknowledgments')
        .select('id')
        .eq('card_id', cardId)
        .eq('staff_name', name)
        .maybeSingle();
      if (existing) return;

      const { error } = await supabase.from('card_acknowledgments').insert({
        card_id: cardId,
        shift,
        staff_name: name,
      });
      if (error) throw error;

      const { data: card } = await supabase
        .from('cards')
        .select('category, first_response_at')
        .eq('id', cardId)
        .maybeSingle();
      const now = new Date().toISOString();
      const patch: { updated_at: string; first_response_at?: string } = { updated_at: now };
      if (card?.category === '컴플레인' && !card.first_response_at) patch.first_response_at = now;

      const { error: touchError } = await supabase.from('cards').update(patch).eq('id', cardId);
      if (touchError) throw touchError;
    },
    onSuccess: () => invalidateCardQueriesLocal(queryClient),
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

      const { data: card } = await supabase
        .from('cards')
        .select('category, first_response_at')
        .eq('id', cardId)
        .maybeSingle();
      const now = new Date().toISOString();
      const patch: { updated_at: string; first_response_at?: string } = { updated_at: now };
      if (card?.category === '컴플레인' && !card.first_response_at) {
        patch.first_response_at = now;
      }
      await supabase.from('cards').update(patch).eq('id', cardId);
    },
    onSuccess: () => invalidateCardQueriesLocal(queryClient),
  });

  const updateComment = useMutation({
    mutationFn: async ({
      commentId,
      cardId,
      content,
      editorShift,
      editorName,
    }: {
      commentId: string;
      cardId: string;
      content: string;
      editorShift: string;
      editorName: string;
    }) => {
      const supabase = createClient();
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('card_comments')
        .update({
          content,
          updated_at: now,
          edited_by_shift: editorShift,
          edited_by_name: editorName,
        })
        .eq('id', commentId)
        .is('deleted_at', null);
      if (error) throw error;
      await supabase.from('cards').update({ updated_at: now }).eq('id', cardId);
    },
    onSuccess: () => invalidateCardQueriesLocal(queryClient),
  });

  const deleteComment = useMutation({
    mutationFn: async ({
      commentId,
      cardId,
      deleterShift,
      deleterName,
    }: {
      commentId: string;
      cardId: string;
      deleterShift: string;
      deleterName: string;
    }) => {
      const supabase = createClient();
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('card_comments')
        .update({
          deleted_at: now,
          deleted_by_shift: deleterShift,
          deleted_by_name: deleterName,
        })
        .eq('id', commentId)
        .is('deleted_at', null);
      if (error) throw error;
      await supabase.from('cards').update({ updated_at: now }).eq('id', cardId);
    },
    onSuccess: () => invalidateCardQueriesLocal(queryClient),
  });

  const uploadAttachment = useMutation({
    mutationFn: async ({ cardId, file, existingCount }: { cardId: string; file: File; existingCount: number }) => {
      const attachment = await uploadCardAttachment(cardId, file, existingCount);
      const supabase = createClient();
      const { error } = await supabase
        .from('cards')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', cardId);
      if (error) throw error;
      return attachment;
    },
    onSuccess: () => invalidateCardQueriesLocal(queryClient),
  });

  /** 사진 주석 저장 — 첨부를 주석이 그려진 이미지로 교체 */
  const annotateAttachment = useMutation({
    mutationFn: async ({
      attachment,
      file,
    }: {
      attachment: Card['card_attachments'][number];
      file: File;
    }) => replaceCardAttachment(attachment, file),
    onSuccess: () => invalidateCardQueriesLocal(queryClient),
  });

  const deleteAttachment = useMutation({
    mutationFn: async (attachment: Card['card_attachments'][number]) => {
      const result = await removeAttachment(attachment);
      const supabase = createClient();
      const { error } = await supabase
        .from('cards')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', attachment.card_id);
      if (error) throw error;
      return result;
    },
    onSuccess: () => invalidateCardQueriesLocal(queryClient),
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
    onSuccess: () => invalidateCardQueriesLocal(queryClient),
  });

  const archiveCardsByIds = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return;
      const supabase = createClient();
      const { error } = await supabase
        .from('cards')
        .update({ archived_at: new Date().toISOString() })
        .in('id', ids)
        .eq('column_id', 'done')
        .is('archived_at', null);
      if (error) throw error;
    },
    onSuccess: () => invalidateCardQueriesLocal(queryClient),
  });

  const restoreFromArchive = useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('cards').update({ archived_at: null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateCardQueriesLocal(queryClient),
  });

  const invalidateThreadQueries = () => {
    invalidateCardQueriesLocal(queryClient);
    void queryClient.invalidateQueries({ queryKey: ['card-thread', DEFAULT_HOTEL_ID] });
  };

  const linkThread = useMutation({
    mutationFn: async ({ source, target }: { source: Card; target: Card }) => {
      const plan = planThreadLink(source, target, () => crypto.randomUUID());
      if (plan.kind === 'none') return plan;

      const supabase = createClient();
      if (plan.kind === 'merge') {
        const { error } = await supabase
          .from('cards')
          .update({ thread_id: plan.threadId })
          .eq('hotel_id', DEFAULT_HOTEL_ID)
          .eq('thread_id', plan.fromThreadId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cards')
          .update({ thread_id: plan.threadId })
          .in('id', plan.cardIds);
        if (error) throw error;
      }
      return plan;
    },
    onSuccess: invalidateThreadQueries,
  });

  const unlinkThread = useMutation({
    mutationFn: async (cardId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from('cards').update({ thread_id: null }).eq('id', cardId);
      if (error) throw error;
    },
    onSuccess: invalidateThreadQueries,
  });

  const setPinned = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('cards')
        .update({ pinned_at: pinned ? new Date().toISOString() : null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalidateCardQueriesLocal(queryClient),
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
    updateComment,
    deleteComment,
    uploadAttachment,
    annotateAttachment,
    deleteAttachment,
    archiveDone,
    archiveCardsByIds,
    restoreFromArchive,
    linkThread,
    unlinkThread,
    setPinned,
  };
}

/** 사건 스레드에 속한 카드 전체 (보관된 카드 포함 — 지난 처리 흐름까지 보여준다) */
export function useCardThread(threadId: string | null) {
  return useQuery({
    queryKey: ['card-thread', DEFAULT_HOTEL_ID, threadId] as const,
    queryFn: async () => {
      const supabase = createClient();
      const run = (excludeTrash: boolean) => {
        let query = supabase
          .from('cards')
          .select(CARD_SELECT)
          .eq('hotel_id', DEFAULT_HOTEL_ID)
          .eq('thread_id', threadId!);
        if (excludeTrash) query = query.is('deleted_at', null);
        return query.order('created_at', { ascending: true });
      };
      let { data, error } = await run(true);
      if (error && isMissingTrashColumn(error)) ({ data, error } = await run(false));
      if (error) throw error;
      return (data ?? []).map((row) => normalizeCard(row as Card));
    },
    enabled: Boolean(threadId),
    staleTime: 15_000,
  });
}

/** N개월 전 자정(로컬) — 하루 안에서는 같은 값이라 쿼리 캐시 키로 쓰기 좋다 */
function monthsAgoIso(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

export type UseArchivedCardsOptions = {
  /** 검색·기간 필터가 없을 때 불러올 최근 개월 수 (0 또는 미지정 = 전체) */
  months?: number;
  search?: string;
  dateFrom?: string | null;
  dateTo?: string | null;
};

/**
 * 보관함 조회 — 평소에는 최근 N개월만 불러오고,
 * 검색어·기간 필터가 있으면 전체 보관 기록을 서버에서 걸러 가져온다.
 */
export function useArchivedCards(options?: UseArchivedCardsOptions) {
  const months = options?.months ?? 0;
  const search = options?.search ?? '';
  const dateFrom = options?.dateFrom ?? null;
  const dateTo = options?.dateTo ?? null;

  // 타이핑마다 서버 요청이 나가지 않도록 검색 조건은 짧게 디바운스
  const [debounced, setDebounced] = useState({ search, dateFrom, dateTo });
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced({ search, dateFrom, dateTo }), 400);
    return () => window.clearTimeout(timer);
  }, [search, dateFrom, dateTo]);

  const searchMode = Boolean(debounced.search.trim() || debounced.dateFrom || debounced.dateTo);
  const since = !searchMode && months > 0 ? monthsAgoIso(months) : null;

  return useQuery({
    queryKey: [
      'archived-cards',
      DEFAULT_HOTEL_ID,
      searchMode
        ? `search:${debounced.search.trim()}|${debounced.dateFrom ?? ''}|${debounced.dateTo ?? ''}`
        : `months:${months}:${since ?? 'all'}`,
    ] as const,
    queryFn: () =>
      fetchArchivedCards(
        searchMode
          ? { search: debounced.search, dateFrom: debounced.dateFrom, dateTo: debounced.dateTo }
          : { since },
      ),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

/** 보관함 총 건수 — 목록 전체를 받지 않고 개수만 센다 */
export function useArchivedCount() {
  return useQuery({
    queryKey: ['archived-cards-count', DEFAULT_HOTEL_ID] as const,
    queryFn: async () => {
      const supabase = createClient();
      const run = (excludeTrash: boolean) => {
        let query = supabase
          .from('cards')
          .select('id', { count: 'exact', head: true })
          .eq('hotel_id', DEFAULT_HOTEL_ID)
          .not('archived_at', 'is', null);
        if (excludeTrash) query = query.is('deleted_at', null);
        return query;
      };
      let { count, error } = await run(true);
      if (error && isMissingTrashColumn(error)) ({ count, error } = await run(false));
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 60_000,
  });
}

/** 휴지통 조회 — 열 때마다 30일 지난 항목을 서버에서 정리한 뒤 목록을 가져온다 */
export function useTrashedCards(enabled: boolean) {
  return useQuery({
    queryKey: ['trashed-cards', DEFAULT_HOTEL_ID] as const,
    enabled,
    staleTime: 15_000,
    queryFn: async (): Promise<{ cards: Card[]; schemaMissing: boolean }> => {
      const supabase = createClient();
      // 만료 정리 — 실패해도 목록 조회는 계속한다 (마이그레이션 전 환경 포함)
      await supabase.rpc('purge_expired_card_trash').then(
        () => undefined,
        () => undefined,
      );
      const { data, error } = await supabase
        .from('cards')
        .select(CARD_SELECT)
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });
      if (error) {
        if (isMissingTrashColumn(error)) return { cards: [], schemaMissing: true };
        throw error;
      }
      const cards = (data ?? []).map((row) => normalizeCard(row as Card));
      return { cards: enrichCardList(cards), schemaMissing: false };
    },
  });
}

/** 휴지통 복원 — deleted_at을 지우면 원래 있던 곳(보드/보관함)으로 돌아간다 */
export function useRestoreTrashedCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from('cards')
        .update({ deleted_at: null, deleted_by: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCardQueriesLocal(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['trashed-cards', DEFAULT_HOTEL_ID] });
      void queryClient.invalidateQueries({ queryKey: ['trashed-cards-count', DEFAULT_HOTEL_ID] });
    },
  });
}

/** 휴지통 건수 — 사이드 휴지통 아이콘의 배지용 (개수만 센다) */
export function useTrashedCount() {
  return useQuery({
    queryKey: ['trashed-cards-count', DEFAULT_HOTEL_ID] as const,
    staleTime: 60_000,
    queryFn: async () => {
      const supabase = createClient();
      const { count, error } = await supabase
        .from('cards')
        .select('id', { count: 'exact', head: true })
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .not('deleted_at', 'is', null);
      if (error) {
        if (isMissingTrashColumn(error)) return 0;
        throw error;
      }
      return count ?? 0;
    },
  });
}

/**
 * 휴지통 영구 삭제 — 스토리지의 첨부 파일까지 정리한 뒤 카드를 완전히 지운다.
 * cards 인자는 휴지통 목록의 카드(첨부 storage_path 포함)여야 한다.
 */
export function useHardDeleteTrashedCards() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cards: Card[]) => {
      if (!cards.length) return;
      const supabase = createClient();
      const storagePaths = cards
        .flatMap((card) => card.card_attachments)
        .map((attachment) => attachment.storage_path)
        .filter(Boolean);
      if (storagePaths.length) {
        await supabase.storage.from('card-attachments').remove(storagePaths);
      }
      const { error } = await supabase
        .from('cards')
        .delete()
        .in('id', cards.map((card) => card.id))
        .not('deleted_at', 'is', null);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCardQueriesLocal(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['trashed-cards', DEFAULT_HOTEL_ID] });
      void queryClient.invalidateQueries({ queryKey: ['trashed-cards-count', DEFAULT_HOTEL_ID] });
    },
  });
}

export function useIsManager() {
  return useQuery({
    queryKey: ['profile-role'],
    queryFn: async () => {
      const supabase = createClient();
      const user = await getSafeUser(supabase);
      if (!user) return false;

      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      return data?.role === 'manager';
    },
  });
}

export function useCurrentUserId() {
  return useQuery({
    queryKey: ['auth-user-id'],
    queryFn: async () => {
      const supabase = createClient();
      const user = await getSafeUser(supabase);
      return user?.id ?? null;
    },
  });
}
