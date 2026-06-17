-- 택배·우편 보관 + 일회용 인도 서명 토큰

create table public.parcels (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  room_number text not null default '',
  guest_name text not null default '',
  carrier text not null default '',
  tracking_number text not null default '',
  storage_slot text not null default '',
  description text not null default '',
  status text not null default 'stored'
    check (status in ('stored', 'ready', 'delivered', 'returned')),
  received_at timestamptz not null default now(),
  ready_at timestamptz,
  delivered_at timestamptz,
  recipient_name text not null default '',
  signature_path text,
  confirmed_by_staff text not null default '',
  contact_notes text not null default '',
  notes text not null default '',
  created_by text not null default '',
  updated_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index parcels_hotel_status_idx on public.parcels (hotel_id, status, received_at desc);
create index parcels_hotel_room_idx on public.parcels (hotel_id, room_number);

create trigger parcels_set_updated_at
  before update on public.parcels
  for each row execute function public.set_updated_at();

create table public.parcel_delivery_tokens (
  id uuid primary key default gen_random_uuid(),
  parcel_id uuid not null references public.parcels (id) on delete cascade,
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_by text not null default '',
  created_at timestamptz not null default now()
);

create index parcel_delivery_tokens_parcel_idx on public.parcel_delivery_tokens (parcel_id, created_at desc);

alter table public.parcels enable row level security;
alter table public.parcel_delivery_tokens enable row level security;

create policy "parcels_all" on public.parcels
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

create policy "parcel_tokens_select" on public.parcel_delivery_tokens
  for select to authenticated
  using (hotel_id = public.user_hotel_id());

create policy "parcel_tokens_insert" on public.parcel_delivery_tokens
  for insert to authenticated
  with check (hotel_id = public.user_hotel_id());

do $$
begin
  alter publication supabase_realtime add table public.parcels;
exception
  when duplicate_object then null;
end $$;

-- Storage: parcel-signatures (서명 PNG — API service role 업로드, 직원 열람)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'parcel-signatures',
  'parcel-signatures',
  false,
  524288,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "parcel_signatures_select" on storage.objects;
drop policy if exists "parcel_signatures_delete" on storage.objects;

create policy "parcel_signatures_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'parcel-signatures'
    and (storage.foldername(name))[1] = (select hotel_id::text from public.profiles where id = auth.uid())
  );

create policy "parcel_signatures_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'parcel-signatures'
    and (storage.foldername(name))[1] = (select hotel_id::text from public.profiles where id = auth.uid())
    and public.user_is_manager()
  );
