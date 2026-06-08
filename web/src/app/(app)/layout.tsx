import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShellSwitcher } from '@/components/layout/app-shell-switcher';
import { HeaderActionsProvider } from '@/components/layout/header-actions';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <HeaderActionsProvider>
      <AppShellSwitcher email={user.email ?? ''}>{children}</AppShellSwitcher>
    </HeaderActionsProvider>
  );
}
