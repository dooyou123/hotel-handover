-- 게스트 안내 스니펫 + C조 야간 레지스터 마감 메모 + 리뷰 OTA 메타

create table public.guest_snippets (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  title text not null,
  category text not null default '기타',
  body_ko text not null default '',
  body_en text not null default '',
  body_zh text not null default '',
  body_ja text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index guest_snippets_hotel_sort_idx on public.guest_snippets (hotel_id, sort_order, title);

create trigger guest_snippets_set_updated_at
  before update on public.guest_snippets
  for each row execute function public.set_updated_at();

alter table public.guest_snippets enable row level security;

create policy "guest_snippets_all" on public.guest_snippets
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

create table public.night_register_logs (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  work_date date not null,
  shift text not null default 'C',
  cash_memo text not null default '',
  card_memo text not null default '',
  seal_notes text not null default '',
  handover_notes text not null default '',
  author text not null default '',
  updated_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hotel_id, work_date, shift)
);

create index night_register_logs_hotel_date_idx on public.night_register_logs (hotel_id, work_date desc);

create trigger night_register_logs_set_updated_at
  before update on public.night_register_logs
  for each row execute function public.set_updated_at();

alter table public.night_register_logs enable row level security;

create policy "night_register_logs_all" on public.night_register_logs
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

alter table public.guest_reviews
  add column if not exists ota_source text not null default '',
  add column if not exists rating numeric(3, 1);

-- 기본 게스트 안내 스니펫
insert into public.guest_snippets (hotel_id, title, category, body_ko, body_en, body_zh, body_ja, sort_order)
select
  '00000000-0000-4000-8000-000000000001'::uuid,
  v.title,
  v.category,
  v.body_ko,
  v.body_en,
  v.body_zh,
  v.body_ja,
  v.sort_order
from (values
  (
    '조식 안내',
    '조식',
    '조식은 1층 레스토랑에서 07:00~10:00까지 이용 가능합니다.',
    'Breakfast is served on the 1st floor from 7:00 AM to 10:00 AM.',
    '早餐在一楼餐厅供应，时间为07:00至10:00。',
    '朝食は1階レストランにて7:00〜10:00までご利用いただけます。',
    10
  ),
  (
    '레イト 체크아웃',
    '체크인/아웃',
    '레イト 체크아웃은 14:00까지 가능하며 추가 요금이 발생할 수 있습니다. 프런트에서 확인해 주세요.',
    'Late check-out until 2:00 PM may be available for an additional fee. Please ask at the front desk.',
    '延迟退房至14:00可能需额外收费，请咨询前台。',
    'レイトチェックアウト（14:00まで）は追加料金が発生する場合があります。フロントでご確認ください。',
    20
  ),
  (
    '택시 호출',
    '교통',
    '택시 호출은 프런트에서 도와드립니다. 목적지와 시간을 알려주세요.',
    'We can call a taxi for you at the front desk. Please tell us your destination and preferred time.',
    '我们可以在前台为您叫出租车，请告知目的地和时间。',
    'タクシーの手配はフロントで承ります。行き先と時間をお知らせください。',
    30
  ),
  (
    'Wi-Fi',
    '시설',
    'Wi-Fi 비밀번호는 객실 키 홀더 또는 프런트 안내를 참고해 주세요.',
    'The Wi-Fi password is on your room key holder or available at the front desk.',
    'Wi-Fi密码请见房卡套或咨询前台。',
    'Wi-Fiパスワードはルームキーホルダーまたはフロントでご確認ください。',
    40
  )
) as v(title, category, body_ko, body_en, body_zh, body_ja, sort_order)
where not exists (
  select 1 from public.guest_snippets s
  where s.hotel_id = '00000000-0000-4000-8000-000000000001'::uuid
    and s.title = v.title
);
