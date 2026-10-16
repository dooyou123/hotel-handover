-- 물품 발주: 분류(탭)를 관리자가 추가·삭제·변경, 품목은 호텔 전원 추가·삭제

create table if not exists public.procurement_categories (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  key text not null,
  label text not null,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (hotel_id, key)
);

create index procurement_categories_hotel_active_idx
  on public.procurement_categories (hotel_id, active, sort_order, label);

create trigger procurement_categories_set_updated_at
  before update on public.procurement_categories
  for each row execute function public.set_updated_at();

-- 기본 분류 시드 (호텔별)
insert into public.procurement_categories (hotel_id, key, label, sort_order)
select h.id, v.key, v.label, v.sort_order
from public.hotels h
cross join (
  values
    ('medicine', '의약품', 10),
    ('office', '사무용품', 20),
    ('amenity', '어메니티', 30),
    ('retail', '판매상품', 40),
    ('event', '이벤트용품', 50),
    ('marketing', '마케팅용품', 60),
    ('other', '기타', 70)
) as v(key, label, sort_order)
on conflict (hotel_id, key) do nothing;

-- 고정 enum 체크 제거 → 동적 분류 키 허용
alter table public.procurement_items drop constraint if exists procurement_items_category_check;
alter table public.procurement_order_lines drop constraint if exists procurement_order_lines_category_check;

alter table public.procurement_order_lines
  add column if not exists category_label text not null default '';

update public.procurement_order_lines
set category_label = case category
  when 'medicine' then '의약품'
  when 'office' then '사무용품'
  when 'amenity' then '어메니티'
  when 'retail' then '판매상품'
  when 'event' then '이벤트용품'
  when 'marketing' then '마케팅용품'
  when 'other' then '기타'
  else coalesce(nullif(category_label, ''), category)
end
where category_label = '';

-- 품목: 호텔 전원이 추가·수정·삭제(비활성)
drop policy if exists "procurement_items_manage" on public.procurement_items;
drop policy if exists "procurement_items_write" on public.procurement_items;
create policy "procurement_items_write" on public.procurement_items
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

-- 분류: 전원 조회, 관리자만 쓰기
alter table public.procurement_categories enable row level security;

drop policy if exists "procurement_categories_select" on public.procurement_categories;
create policy "procurement_categories_select" on public.procurement_categories
  for select to authenticated
  using (hotel_id = public.user_hotel_id());

drop policy if exists "procurement_categories_manage" on public.procurement_categories;
create policy "procurement_categories_manage" on public.procurement_categories
  for all to authenticated
  using (hotel_id = public.user_hotel_id() and public.user_is_manager())
  with check (hotel_id = public.user_hotel_id() and public.user_is_manager());

do $$
begin
  alter publication supabase_realtime add table public.procurement_categories;
exception
  when duplicate_object then null;
end $$;
