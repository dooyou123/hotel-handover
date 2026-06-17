'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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

    void supabase.auth.getSession().then(({ data }) => {
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
