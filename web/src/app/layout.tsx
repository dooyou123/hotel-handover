import type { Metadata } from 'next';
import { QueryProvider } from '@/components/providers/query-provider';
import { ConfirmDialogProvider } from '@/components/ui/confirm-dialog';
import './globals.css';

export const metadata: Metadata = {
  title: '프런트 인수인계 보드',
  description: '호텔 프런트 3교대 인수인계 · Next.js + Supabase',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="/handover.css" />
      </head>
      <body className="min-h-full antialiased">
        <QueryProvider>
          <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
