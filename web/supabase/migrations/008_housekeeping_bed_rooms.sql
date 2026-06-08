-- Housekeeping report: bed rooms (4~13층 02/10/16) + special room notes.

alter table public.housekeeping_reports
  drop column if exists twin_assignee,
  drop column if exists triple_assignee,
  drop column if exists extra_assignee;

alter table public.housekeeping_report_rooms
  add column if not exists row_kind text not null default 'bed'
    check (row_kind in ('bed', 'special')),
  add column if not exists extra_bed_action text not null default ''
    check (extra_bed_action in ('', 'add', 'remove', 'keep')),
  add column if not exists early_checkin text not null default '',
  add column if not exists is_vip boolean not null default false,
  add column if not exists is_long_stay boolean not null default false,
  add column if not exists notes text not null default '';

update public.housekeeping_report_rooms
set notes = trim(coalesce(nullif(next_day_notes, ''), previous_notes, bedding, ''))
where notes = '';

alter table public.housekeeping_report_rooms
  drop column if exists guest_status,
  drop column if exists bedding,
  drop column if exists previous_notes,
  drop column if exists next_day_notes;
