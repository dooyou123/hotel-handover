import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppShellNova } from '@/components/layout/app-shell-nova';
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
      <AppShellNova email={user.email ?? ''}>{children}</AppShellNova>
    </HeaderActionsProvider>
  );
}
