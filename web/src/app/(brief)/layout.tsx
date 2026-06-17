import { redirect } from 'next/navigation';
import { getSafeUser } from '@/lib/supabase/auth-session';
import { createClient } from '@/lib/supabase/server';

export default async function BriefLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const user = await getSafeUser(supabase);

  if (!user) {
    redirect('/login');
  }

  return <div className="brief-shell">{children}</div>;
}
