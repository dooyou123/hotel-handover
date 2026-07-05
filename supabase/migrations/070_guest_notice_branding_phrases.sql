-- 고객 안내: 호텔 로고·하단 문구·상용구

alter table public.hotels
  add column if not exists guest_notice_logo_path text not null default '',
  add column if not exists guest_notice_footer_ko text not null default '',
  add column if not exists guest_notice_footer_en text not null default '',
  add column if not exists guest_notice_footer_zh text not null default '',
  add column if not exists guest_notice_footer_ja text not null default '';

create table public.guest_notice_phrases (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  title text not null,
  body_ko text not null default '',
  body_en text not null default '',
  body_zh text not null default '',
  body_ja text not null default '',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index guest_notice_phrases_hotel_active_idx
  on public.guest_notice_phrases (hotel_id, is_active, sort_order, title);

create trigger guest_notice_phrases_set_updated_at
  before update on public.guest_notice_phrases
  for each row execute function public.set_updated_at();

alter table public.guest_notice_phrases enable row level security;

create policy "guest_notice_phrases_all" on public.guest_notice_phrases
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

do $$
begin
  alter publication supabase_realtime add table public.guest_notice_phrases;
exception
  when duplicate_object then null;
end $$;

-- Storage: hotel-branding (로고 — 인쇄·화면 표시용 공개 URL)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hotel-branding',
  'hotel-branding',
  true,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "hotel_branding_select" on storage.objects;
drop policy if exists "hotel_branding_insert" on storage.objects;
drop policy if exists "hotel_branding_update" on storage.objects;
drop policy if exists "hotel_branding_delete" on storage.objects;

create policy "hotel_branding_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'hotel-branding'
    and (storage.foldername(name))[1] = (select hotel_id::text from public.profiles where id = auth.uid())
  );

create policy "hotel_branding_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'hotel-branding'
    and (storage.foldername(name))[1] = (select hotel_id::text from public.profiles where id = auth.uid())
  );

create policy "hotel_branding_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'hotel-branding'
    and (storage.foldername(name))[1] = (select hotel_id::text from public.profiles where id = auth.uid())
  );

create policy "hotel_branding_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'hotel-branding'
    and (storage.foldername(name))[1] = (select hotel_id::text from public.profiles where id = auth.uid())
  );

-- 기본 상용구
insert into public.guest_notice_phrases (
  hotel_id, title, body_ko, body_en, body_zh, body_ja, sort_order
)
select
  '00000000-0000-4000-8000-000000000001'::uuid,
  v.title,
  v.body_ko,
  v.body_en,
  v.body_zh,
  v.body_ja,
  v.sort_order
from (values
  (
    '불편 사과',
    E'이용에 불편을 드려 대단히 죄송합니다.\n불편하신 점은 최대한 신속히 조치하겠습니다.',
    E'We sincerely apologize for any inconvenience.\nWe will address the issue as quickly as possible.',
    E'给您带来不便，深表歉意。\n我们将尽快处理相关问题。',
    E'ご不便をおかけし誠に申し訳ございません。\n速やかに対応いたします。',
    10
  ),
  (
    '프런트 연락',
    E'문의 사항은 언제든지 프런트 데스크(내선 0)로 연락해 주시기 바랍니다.',
    E'For any inquiries, please contact the front desk (extension 0) at any time.',
    E'如有疑问，请随时联系前台（内线0）。',
    E'ご不明な点がございましたら、フロントデスク（内線0）までお気軽にお問い合わせください。',
    20
  ),
  (
    '소음·공사 안내',
    E'공사·점검으로 인한 소음·진동이 발생할 수 있으며, 이용에 불편을 드려 죄송합니다.',
    E'Due to construction or maintenance, noise and vibration may occur. We apologize for any inconvenience.',
    E'因施工或检修可能产生噪音和振动，敬请谅解。',
    E'工事・点検のため騒音・振動が発生する場合がございます。ご不便をおかけし申し訳ございません。',
    30
  ),
  (
    '안전 유의',
    E'공사 구역 출입을 삼가 주시고, 안내에 따라 안전에 유의해 주시기 바랍니다.',
    E'Please refrain from entering construction areas and follow safety instructions.',
    E'请勿进入施工区域，并请注意安全。',
    E'工事区域への立ち入りはご遠慮いただき、安全にご注意ください。',
    40
  )
) as v(title, body_ko, body_en, body_zh, body_ja, sort_order)
where not exists (
  select 1 from public.guest_notice_phrases p
  where p.hotel_id = '00000000-0000-4000-8000-000000000001'::uuid
    and p.title = v.title
);
