-- Allow all hotel members (not only managers) to manage staff roster and card templates.

drop policy if exists "hotel_manage_staff" on public.staff;
create policy "hotel_manage_staff" on public.staff for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

drop policy if exists "card_templates_manage" on public.card_templates;
create policy "card_templates_manage" on public.card_templates for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());
