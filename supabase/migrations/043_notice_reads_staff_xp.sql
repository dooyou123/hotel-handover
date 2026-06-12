-- 게시판 고정 공지 읽음 추적 + 직원 경험치

create table public.notice_reads (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  notice_id uuid not null references public.notices (id) on delete cascade,
  staff_name text not null,
  shift text not null default '',
  read_at timestamptz not null default now(),
  unique (notice_id, staff_name)
);

create index idx_notice_reads_notice on public.notice_reads (notice_id);
create index idx_notice_reads_hotel on public.notice_reads (hotel_id);

alter table public.notice_reads enable row level security;

create policy "notice_reads_all" on public.notice_reads for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

-- ---------------------------------------------------------------------------
-- Staff XP
-- ---------------------------------------------------------------------------

create table public.staff_xp (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  staff_name text not null,
  xp integer not null default 0 check (xp >= 0),
  updated_at timestamptz not null default now(),
  unique (hotel_id, staff_name)
);

create index idx_staff_xp_hotel on public.staff_xp (hotel_id);

alter table public.staff_xp enable row level security;

create policy "staff_xp_all" on public.staff_xp for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

create or replace function public.award_staff_xp(
  p_hotel_id uuid,
  p_staff_name text,
  p_amount integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_xp integer;
  v_prev_level integer;
  v_new_level integer;
begin
  if p_hotel_id is distinct from public.user_hotel_id() then
    raise exception '권한이 없습니다.';
  end if;

  v_name := trim(p_staff_name);
  if v_name = '' then
    return jsonb_build_object('xp', 0, 'level', 1, 'leveled_up', false);
  end if;

  if p_amount <= 0 then
    select xp into v_xp from public.staff_xp
    where hotel_id = p_hotel_id and staff_name = v_name;
    v_xp := coalesce(v_xp, 0);
    v_new_level := greatest(1, (v_xp / 100) + 1);
    return jsonb_build_object('xp', v_xp, 'level', v_new_level, 'leveled_up', false);
  end if;

  insert into public.staff_xp (hotel_id, staff_name, xp)
  values (p_hotel_id, v_name, p_amount)
  on conflict (hotel_id, staff_name)
  do update set
    xp = public.staff_xp.xp + excluded.xp,
    updated_at = now()
  returning xp into v_xp;

  v_prev_level := greatest(1, ((v_xp - p_amount) / 100) + 1);
  v_new_level := greatest(1, (v_xp / 100) + 1);

  return jsonb_build_object(
    'xp', v_xp,
    'level', v_new_level,
    'leveled_up', v_new_level > v_prev_level
  );
end;
$$;

grant execute on function public.award_staff_xp(uuid, text, integer) to authenticated;

alter publication supabase_realtime add table public.staff_xp;
