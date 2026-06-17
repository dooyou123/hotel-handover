import { redirect } from 'next/navigation';
import { getSafeUser } from '@/lib/supabase/auth-session';
import { createClient } from '@/lib/supabase/server';

export default async function BoardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const user = await getSafeUser(supabase);

  if (!user) {
    redirect('/login?next=/board');
  }

  return <div className="live-board-shell">{children}</div>;
}
