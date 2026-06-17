import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function BoardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/board');
  }

  return <div className="live-board-shell">{children}</div>;
}
