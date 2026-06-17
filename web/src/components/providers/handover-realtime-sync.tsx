'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { clearStaleAuthSession, isStaleRefreshError } from '@/lib/supabase/auth-session';
import { createClient } from '@/lib/supabase/client';
import { subscribeHandoverRealtime } from '@/lib/supabase/handover-realtime';

export function HandoverRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    let unsubscribe: (() => void) | undefined;

    function start() {
      unsubscribe?.();
      unsubscribe = subscribeHandoverRealtime(queryClient);
    }

    void supabase.auth.getSession().then(async ({ data, error }) => {
      if (error && isStaleRefreshError(error.code, error.message)) {
        await clearStaleAuthSession(supabase);
        return;
      }
      if (data.session) start();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        start();
      } else {
        unsubscribe?.();
        unsubscribe = undefined;
      }
    });

    return () => {
      subscription.unsubscribe();
      unsubscribe?.();
    };
  }, [queryClient]);

  return null;
}
