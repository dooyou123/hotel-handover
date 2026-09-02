-- OTA 계정별 직원 메모 (구글 시트와 별도, 앱에서 직접 편집)

create table if not exists public.ota_account_memos (
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  account_key text not null,
  memo text not null default '',
  updated_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (hotel_id, account_key)
);

create trigger ota_account_memos_set_updated_at
  before update on public.ota_account_memos
  for each row execute function public.set_updated_at();

alter table public.ota_account_memos enable row level security;

drop policy if exists "ota_account_memos_all" on public.ota_account_memos;
create policy "ota_account_memos_all" on public.ota_account_memos
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());
