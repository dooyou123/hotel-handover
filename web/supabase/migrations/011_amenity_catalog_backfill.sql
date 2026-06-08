-- Backfill full amenity catalog (15 items) for all hotels.
-- Safe to re-run: on conflict do nothing for amenities, inventory rows.

insert into public.amenities (hotel_id, name, box_size, unit_size, sort_order)
select h.id, v.name, v.box_size, v.unit_size, v.sort_order
from public.hotels h
cross join (
  values
    ('덴탈키트', 250, 25, 1),
    ('면도기', 500, 25, 2),
    ('빗', 500, 25, 3),
    ('입욕제(라벤더)', 500, 50, 4),
    ('입욕제(자스민)', 500, 50, 5),
    ('설탕', 1000, 100, 6),
    ('샤워캡', 1000, 100, 7),
    ('헤어밴드', 2000, 100, 8),
    ('티(잉글리시)', 1200, 100, 9),
    ('티(얼그레이)', 1200, 100, 10),
    ('티(카모마일)', 1200, 100, 11),
    ('커피스틱', 1000, 1000, 12),
    ('마스크팩', 400, 80, 13),
    ('종이컵(대)', 1200, 100, 14),
    ('종이컵(소)', 1200, 100, 15)
) as v(name, box_size, unit_size, sort_order)
on conflict (hotel_id, name) do nothing;

insert into public.amenity_inventory (hotel_id, amenity_id, quantity)
select a.hotel_id, a.id, 0
from public.amenities a
on conflict (hotel_id, amenity_id) do nothing;
