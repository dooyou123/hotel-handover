-- 리뷰·메일 답변 템플릿 (다국어)

create table public.review_reply_templates (
  id uuid primary key default gen_random_uuid(),
  hotel_id uuid not null references public.hotels (id) on delete cascade,
  title text not null,
  sentiment text not null default 'general'
    check (sentiment in ('positive', 'negative', 'general')),
  channel text not null default 'both'
    check (channel in ('review', 'email', 'both')),
  body_ko text not null default '',
  body_en text not null default '',
  body_zh text not null default '',
  body_ja text not null default '',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index review_reply_templates_hotel_active_idx
  on public.review_reply_templates (hotel_id, is_active, sentiment, sort_order, title);

create trigger review_reply_templates_set_updated_at
  before update on public.review_reply_templates
  for each row execute function public.set_updated_at();

alter table public.review_reply_templates enable row level security;

create policy "review_reply_templates_all" on public.review_reply_templates
  for all to authenticated
  using (hotel_id = public.user_hotel_id())
  with check (hotel_id = public.user_hotel_id());

insert into public.review_reply_templates (
  hotel_id, title, sentiment, channel, body_ko, body_en, body_zh, body_ja, sort_order
)
select
  '00000000-0000-4000-8000-000000000001'::uuid,
  v.title,
  v.sentiment,
  v.channel,
  v.body_ko,
  v.body_en,
  v.body_zh,
  v.body_ja,
  v.sort_order
from (values
  (
    '긍정 리뷰 감사',
    'positive',
    'review',
    E'안녕하세요.\n소중한 리뷰와 따뜻한 평가 진심으로 감사드립니다.\n다음에도 편안한 숙박이 되실 수 있도록 최선을 다하겠습니다.',
    E'Dear Guest,\nThank you very much for your kind review and for choosing our hotel.\nWe look forward to welcoming you again soon.',
    E'尊敬的客人，\n非常感谢您的好评与光临。\n期待您再次入住。',
    E'お客様\nこの度はご宿泊および温かいクチコミを誠にありがとうございます。\nまたのお越しを心よりお待ちしております。',
    10
  ),
  (
    '불편 사과',
    'negative',
    'review',
    E'안녕하세요.\n불편을 드린 점 진심으로 사과드립니다.\n말씀해 주신 내용은 즉시 공유하여 개선하겠습니다. 다시 뵙게 된다면 더 나은 서비스로 보답하겠습니다.',
    E'Dear Guest,\nWe sincerely apologize for the inconvenience you experienced.\nYour feedback has been shared with our team for immediate improvement. We hope to serve you better on your next visit.',
    E'尊敬的客人，\n对于给您带来的不便，我们深表歉意。\n我们已将您的意见反馈给相关部门并尽快改进，期待再次为您服务。',
    E'お客様\nこの度はご不便をおかけし誠に申し訳ございません。\nいただいたご意見は担当部署と共有し改善に努めてまいります。再度のご利用を心よりお待ちしております。',
    20
  ),
  (
    '메일 문의 답변',
    'general',
    'email',
    E'안녕하세요.\n문의 주셔서 감사합니다.\n\n[문의 답변 내용]\n\n추가 문의 사항이 있으시면 언제든지 연락 주시기 바랍니다.\n감사합니다.',
    E'Dear Guest,\nThank you for your inquiry.\n\n[Your response]\n\nPlease feel free to contact us if you need any further assistance.\nBest regards,',
    E'尊敬的客人，\n感谢您的来信。\n\n[回复内容]\n\n如有其他疑问，请随时与我们联系。\n谢谢。',
    E'お客様\nお問い合わせいただきありがとうございます。\n\n[ご回答内容]\n\nその他ご不明な点がございましたら、お気軽にご連絡ください。',
    30
  )
) as v(title, sentiment, channel, body_ko, body_en, body_zh, body_ja, sort_order)
where not exists (
  select 1 from public.review_reply_templates t
  where t.hotel_id = '00000000-0000-4000-8000-000000000001'::uuid
    and t.title = v.title
);
