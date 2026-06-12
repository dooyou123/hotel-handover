-- 팀 채팅 기능 제거

do $$
begin
  if exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'team_messages'
  ) then
    alter publication supabase_realtime drop table public.team_messages;
  end if;
end $$;

drop table if exists public.team_messages;
