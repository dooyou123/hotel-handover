-- 직원 레벨/경험치 기능 제거 (공지 읽음 추적은 유지)
drop function if exists public.award_staff_xp(uuid, text, integer);

drop table if exists public.staff_xp;
