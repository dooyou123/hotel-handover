'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import {
  fetchGuestNoticeBranding,
  removeGuestNoticeLogo,
  saveGuestNoticeBranding,
  uploadGuestNoticeLogo,
} from '@/lib/guest-notices/branding';
import type { GuestNoticeBrandingInput } from '@/lib/guest-notices/types';

export function useGuestNoticeBranding() {
  const queryClient = useQueryClient();
  const queryKey = ['guest-notice-branding', DEFAULT_HOTEL_ID] as const;

  const query = useQuery({ queryKey, queryFn: () => fetchGuestNoticeBranding() });

  const saveFooter = useMutation({
    mutationFn: (input: GuestNoticeBrandingInput) => saveGuestNoticeBranding(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const uploadLogo = useMutation({
    mutationFn: (file: File) => uploadGuestNoticeLogo(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const removeLogo = useMutation({
    mutationFn: () => removeGuestNoticeLogo(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    branding: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    saveFooter,
    uploadLogo,
    removeLogo,
  };
}
