'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { HandoverRealtimeSync } from '@/components/providers/handover-realtime-sync';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={client}>
      <HandoverRealtimeSync />
      {children}
    </QueryClientProvider>
  );
}
