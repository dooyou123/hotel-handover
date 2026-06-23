import type { Metadata } from 'next';
import { QueryProvider } from '@/components/providers/query-provider';
import { UiThemeProvider } from '@/components/providers/ui-theme-provider';
import { UiThemeBootScript } from '@/components/layout/ui-theme-boot-script';
import { ConfirmDialogProvider } from '@/components/ui/confirm-dialog';
import './globals.css';

export const metadata: Metadata = {
  title: '프런트 인수인계 보드',
  description: '호텔 프런트 3교대 인수인계 · Next.js + Supabase',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover' as const,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" data-ui="project">
      <head>
        <link rel="stylesheet" href="/handover-tokens.css" />
        <link rel="stylesheet" href="/handover-components.css" />
        <link rel="stylesheet" href="/handover-legacy.css" />
        <link rel="stylesheet" href="/handover-modern-shell.css" />
        <link rel="stylesheet" href="/handover-project.css" />
      </head>
      <body className="min-h-full antialiased">
        <UiThemeBootScript />
        <QueryProvider>
          <UiThemeProvider>
            <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
          </UiThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
