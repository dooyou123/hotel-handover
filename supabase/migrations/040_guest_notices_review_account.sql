-- 리뷰 Account(여행사) + 게스트 안내문(스니펫 대체)

alter table public.guest_reviews
  add column if not exists account text not null default '';

create table if not exists public.guest_notices (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  title text not null,
  category text not null default '안내'
    check (category in ('안내', '공사', '비상', '기타')),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  body_ko text not null default '',
  body_en text not null default '',
  body_zh text not null default '',
  body_ja text not null default '',
  valid_from date,
  valid_until date,
  author text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists guest_notices_hotel_status_idx
  on public.guest_notices (hotel_id, status, sort_order, title);

create trigger guest_notices_set_updated_at
  before update on public.guest_notices
  for each row execute function public.set_updated_at();

alter table public.guest_notices enable row level security;

drop policy if exists "guest_notices_all" on public.guest_notices;
create policy "guest_notices_all" on public.guest_notices
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

create table if not exists public.guest_notice_logs (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  notice_id uuid not null references public.guest_notices (id) on delete cascade,
  action text not null check (action in ('viewed', 'printed', 'confirmed')),
  staff_name text not null default '',
  work_group text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists guest_notice_logs_notice_idx
  on public.guest_notice_logs (notice_id, created_at desc);

alter table public.guest_notice_logs enable row level security;

drop policy if exists "guest_notice_logs_all" on public.guest_notice_logs;
create policy "guest_notice_logs_all" on public.guest_notice_logs
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

-- guest_snippets → guest_notices 이전 (039 적용 환경)
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'guest_snippets'
  ) then
    insert into public.guest_notices (
      hotel_id, title, category, status, body_ko, body_en, body_zh, body_ja, sort_order, author
    )
    select
      s.hotel_id,
      s.title,
      case when s.category in ('안내', '공사', '비상', '기타') then s.category else '안내' end,
      'published',
      s.body_ko,
      s.body_en,
      s.body_zh,
      s.body_ja,
      s.sort_order,
      'system'
    from public.guest_snippets s
    where not exists (
      select 1 from public.guest_notices n
      where n.hotel_id = s.hotel_id and n.title = s.title
    );

    drop table public.guest_snippets;
  end if;
end $$;

-- 기본 안내문 (스니펫 없이 신규 설치)
insert into public.guest_notices (
  hotel_id, title, category, status, body_ko, body_en, body_zh, body_ja, sort_order, author
)
select
  '00000000-0000-4000-8000-000000000001'::uuid,
  v.title,
  v.category,
  'published',
  v.body_ko,
  v.body_en,
  v.body_zh,
  v.body_ja,
  v.sort_order,
  'system'
from (values
  (
    '조식 안내',
    '안내',
    E'조식 안내\n\n조식은 1층 레스토랑에서 07:00~10:00까지 이용 가능합니다.\n객실 열쇠를 지참해 주세요.',
    E'Breakfast Information\n\nBreakfast is served on the 1st floor restaurant from 7:00 AM to 10:00 AM.\nPlease bring your room key.',
    E'早餐说明\n\n早餐在一楼餐厅供应，时间为07:00至10:00。\n请携带房卡。',
    E'朝食のご案内\n\n朝食は1階レストランにて7:00〜10:00までご利用いただけます。\nルームキーをお持ちください。',
    10
  ),
  (
    '공사 안내 (샘플)',
    '공사',
    E'시설 공사 안내\n\n○○일부터 ○○일까지 ○층 ○○ 구역에서 공사가 진행됩니다.\n소음·진동이 발생할 수 있으며 이용에 불편을 드려 죄송합니다.',
    E'Construction Notice\n\nConstruction work will take place from [date] to [date] on floor [X].\nWe apologize for any inconvenience caused by noise or vibration.',
    E'施工通知\n\n[日期]起至[日期]止，[楼层]区域将进行施工。\n施工期间可能有噪音，敬请谅解。',
    E'工事のお知らせ\n\n[日付]より[日付]まで[階]にて工事を実施いたします。\n騒音等ご不便をおかけし申し訳ございません。',
    20
  )
) as v(title, category, body_ko, body_en, body_zh, body_ja, sort_order)
where not exists (
  select 1 from public.guest_notices n
  where n.hotel_id = '00000000-0000-4000-8000-000000000001'::uuid
    and n.title = v.title
);
