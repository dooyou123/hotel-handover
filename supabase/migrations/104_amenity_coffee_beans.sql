-- 커피 원두: 봉지(봉) 단위 재고. 기존 품목은 unit='개' 유지.
-- 이 파일은 카탈로그·재고 행만 추가한다. 샘플 카드·리뷰를 넣지 않는다.

alter table public.amenities
  add column if not exists unit text not null default '개';

-- 커피스틱 바로 뒤에 오도록 후속 품목 순서를 한 칸씩 민다.
update public.amenities
set sort_order = 16
where name = '종이컵(소)' and sort_order = 15;

update public.amenities
set sort_order = 15
where name = '종이컵(대)' and sort_order = 14;

update public.amenities
set sort_order = 14
where name = '마스크팩' and sort_order = 13;

insert into public.amenities (hotel_id, name, box_size, unit_size, sort_order, unit)
select h.id, '커피 원두', 5, 1, 13, '봉'
from public.hotels h
on conflict (hotel_id, name) do update
  set unit = excluded.unit,
      box_size = excluded.box_size,
      unit_size = excluded.unit_size,
      sort_order = excluded.sort_order;

insert into public.amenity_inventory (hotel_id, amenity_id, quantity)
select a.hotel_id, a.id, 0
from public.amenities a
where a.name = '커피 원두'
on conflict (hotel_id, amenity_id) do nothing;
