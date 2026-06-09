'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { APP_NAV, DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';

/** 숨김 설정 가능한 메뉴 (인수인계·설정은 항상 표시) */
export const CONFIGURABLE_NAV = APP_NAV.filter(
  (item) => item.href !== '/handover' && item.href !== '/settings',
);

export const CONFIGURABLE_NAV_HREFS = new Set<string>(CONFIGURABLE_NAV.map((item) => item.href));

export type NavItem = (typeof APP_NAV)[number];

const navSettingsPool = {
  channel: null as RealtimeChannel | null,
  listeners: new Set<QueryClient>(),
};

function notifyNavSettingsListeners() {
  navSettingsPool.listeners.forEach((client) => {
    client.invalidateQueries({ queryKey: ['hotel-nav-visibility', DEFAULT_HOTEL_ID] });
  });
}

function ensureNavSettingsChannel(supabase: SupabaseClient) {
  if (navSettingsPool.channel) return;

  navSettingsPool.channel = supabase
    .channel('hotel-nav-settings')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'hotels', filter: `id=eq.${DEFAULT_HOTEL_ID}` },
      () => notifyNavSettingsListeners(),
    )
    .subscribe();
}

function releaseNavSettingsChannel(supabase: SupabaseClient) {
  if (navSettingsPool.listeners.size > 0 || !navSettingsPool.channel) return;
  supabase.removeChannel(navSettingsPool.channel);
  navSettingsPool.channel = null;
}

export function subscribeHotelNavSettings(queryClient: QueryClient): () => void {
  const supabase = createClient();
  navSettingsPool.listeners.add(queryClient);
  ensureNavSettingsChannel(supabase);

  return () => {
    navSettingsPool.listeners.delete(queryClient);
    releaseNavSettingsChannel(supabase);
  };
}

function normalizeHiddenNavHrefs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((href): href is string => typeof href === 'string' && CONFIGURABLE_NAV_HREFS.has(href));
}

export function filterVisibleNav<T extends { href: string }>(items: readonly T[], hiddenHrefs: string[]): T[] {
  if (!hiddenHrefs.length) return [...items];
  const hidden = new Set(hiddenHrefs);
  return items.filter((item) => !hidden.has(item.href));
}

export function isNavPathHidden(pathname: string, hiddenHrefs: string[]): boolean {
  return hiddenHrefs.some((href) => pathname === href || pathname.startsWith(`${href}/`));
}

async function fetchHiddenNavHrefs(): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('hotels')
    .select('hidden_nav_hrefs')
    .eq('id', DEFAULT_HOTEL_ID)
    .maybeSingle();

  if (error) throw error;
  return normalizeHiddenNavHrefs(data?.hidden_nav_hrefs);
}

export async function saveHiddenNavHrefs(hiddenHrefs: string[]): Promise<string[]> {
  const normalized = normalizeHiddenNavHrefs(hiddenHrefs);
  const supabase = createClient();
  const { data, error } = await supabase
    .from('hotels')
    .update({ hidden_nav_hrefs: normalized })
    .eq('id', DEFAULT_HOTEL_ID)
    .select('hidden_nav_hrefs')
    .single();

  if (error) throw error;
  return normalizeHiddenNavHrefs(data.hidden_nav_hrefs);
}

export function useHiddenNavHrefs() {
  const queryClient = useQueryClient();
  const queryKey = ['hotel-nav-visibility', DEFAULT_HOTEL_ID] as const;

  const query = useQuery({
    queryKey,
    queryFn: fetchHiddenNavHrefs,
    staleTime: 60_000,
  });

  useEffect(() => subscribeHotelNavSettings(queryClient), [queryClient]);

  return query;
}

export function useVisibleNavItems() {
  const { data: hiddenHrefs = [], isLoading } = useHiddenNavHrefs();
  return {
    items: filterVisibleNav(APP_NAV, hiddenHrefs),
    hiddenHrefs,
    isLoading,
  };
}

export type NavDisplayItem = NavItem & {
  staffVisible: boolean;
  alwaysVisible: boolean;
};

export function useNavDisplay() {
  const { data: hiddenHrefs = [], isLoading } = useHiddenNavHrefs();
  const hiddenSet = new Set(hiddenHrefs);

  const items: NavDisplayItem[] = APP_NAV.map((item) => {
    const alwaysVisible = !CONFIGURABLE_NAV_HREFS.has(item.href);
    return {
      ...item,
      alwaysVisible,
      staffVisible: alwaysVisible || !hiddenSet.has(item.href),
    };
  });

  return { items, hiddenHrefs, isLoading };
}

export function useNavItemsForUser(isManager: boolean) {
  const display = useNavDisplay();
  const visible = useVisibleNavItems();

  if (isManager) {
    return {
      items: display.items,
      hiddenHrefs: display.hiddenHrefs,
      isLoading: display.isLoading,
      showStaffVisibility: true as const,
    };
  }

  return {
    items: visible.items.map((item) => ({
      ...item,
      staffVisible: true,
      alwaysVisible: !CONFIGURABLE_NAV_HREFS.has(item.href),
    })),
    hiddenHrefs: visible.hiddenHrefs,
    isLoading: visible.isLoading,
    showStaffVisibility: false as const,
  };
}
