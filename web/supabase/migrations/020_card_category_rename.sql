-- 인수인계 카드 카테고리: VIP → 시설, 민원 → 컴플레인
update public.cards set category = '시설' where category = 'VIP';
update public.cards set category = '컴플레인' where category = '민원';

update public.card_templates set category = '시설' where category = 'VIP';
update public.card_templates set category = '컴플레인' where category = '민원';
