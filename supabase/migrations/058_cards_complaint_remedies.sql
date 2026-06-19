-- 컴플레인 카드: 제공 품목(고정 목록 + 기타)
alter table cards
  add column if not exists complaint_remedies text[] not null default '{}',
  add column if not exists complaint_remedy_other text not null default '';
