'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { ColumnId, Priority } from '@/lib/handover/types';

export type StaffMember = {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
};

export type ChecklistItemDef = {
  id: string;
  label: string;
  sort_order: number;
  work_group: string;
};

export type CardTemplate = {
  id: string;
  label: string;
  priority: Priority;
  column_id: ColumnId;
  category: string;
  title: string;
  next_action: string;
  details: string;
  sort_order: number;
  is_active: boolean;
};

export type CardTemplateInput = {
  label: string;
  priority: Priority;
  column_id: ColumnId;
  category: string;
  title: string;
  next_action: string;
  details: string;
};

export function useStaffList(includeInactive = false) {
  return useQuery({
    queryKey: ['staff', DEFAULT_HOTEL_ID, includeInactive],
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase.from('staff').select('id, name, is_active, sort_order').eq('hotel_id', DEFAULT_HOTEL_ID);
      if (!includeInactive) query = query.eq('is_active', true);
      const { data, error } = await query.order('sort_order');
      if (error) throw error;
      return (data ?? []) as StaffMember[];
    },
  });
}

export function useChecklistDefinitions() {
  return useQuery({
    queryKey: ['checklist-definitions', DEFAULT_HOTEL_ID],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('checklist_items')
        .select('id, label, sort_order, work_group')
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as ChecklistItemDef[];
    },
  });
}

export function useCardTemplates() {
  return useQuery({
    queryKey: ['card-templates', DEFAULT_HOTEL_ID],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('card_templates')
        .select('*')
        .eq('hotel_id', DEFAULT_HOTEL_ID)
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as CardTemplate[];
    },
  });
}

export async function createStaff(name: string) {
  const supabase = createClient();
  const { data: maxRow } = await supabase
    .from('staff')
    .select('sort_order')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = (maxRow?.sort_order ?? -1) + 1;
  const { error } = await supabase.from('staff').insert({ hotel_id: DEFAULT_HOTEL_ID, name, sort_order: sortOrder });
  if (error) throw error;
}

export async function updateStaffName(id: string, name: string) {
  const supabase = createClient();
  const { error } = await supabase.from('staff').update({ name }).eq('id', id);
  if (error) throw error;
}

export async function deactivateStaff(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('staff').update({ is_active: false }).eq('id', id);
  if (error) throw error;
}

export async function createChecklistDefinition(label: string, workGroup: string = 'common') {
  const supabase = createClient();
  const { data: maxRow } = await supabase
    .from('checklist_items')
    .select('sort_order')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = (maxRow?.sort_order ?? -1) + 1;
  const { error } = await supabase
    .from('checklist_items')
    .insert({ hotel_id: DEFAULT_HOTEL_ID, label, sort_order: sortOrder, work_group: workGroup });
  if (error) throw error;
}

export async function deactivateChecklistDefinition(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('checklist_items').update({ is_active: false }).eq('id', id);
  if (error) throw error;
}

export async function saveCardTemplate(input: CardTemplateInput, id?: string) {
  const supabase = createClient();
  if (id) {
    const { error } = await supabase.from('card_templates').update(input).eq('id', id);
    if (error) throw error;
    return;
  }
  const { data: maxRow } = await supabase
    .from('card_templates')
    .select('sort_order')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = (maxRow?.sort_order ?? -1) + 1;
  const { error } = await supabase.from('card_templates').insert({ ...input, hotel_id: DEFAULT_HOTEL_ID, sort_order: sortOrder });
  if (error) throw error;
}

export async function deactivateCardTemplate(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from('card_templates').update({ is_active: false }).eq('id', id);
  if (error) throw error;
}

export function invalidateSettingsQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['staff'] });
  queryClient.invalidateQueries({ queryKey: ['checklist-definitions'] });
  queryClient.invalidateQueries({ queryKey: ['card-templates'] });
  queryClient.invalidateQueries({ queryKey: ['checklist'] });
  queryClient.invalidateQueries({ queryKey: ['user-feedback'] });
}
