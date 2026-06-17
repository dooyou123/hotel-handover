-- card_attachments realtime (댓글·첨부 변경 시 다른 클라이언트 동기화)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'card_attachments'
  ) then
    alter publication supabase_realtime add table public.card_attachments;
  end if;
end $$;
