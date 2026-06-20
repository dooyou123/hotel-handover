'use client';

import Link from 'next/link';
import { APP_NAV } from '@/lib/constants';
import { CATEGORY_OPTIONS, QUICK_FILTERS } from '@/lib/handover/constants';

const QUICK_LINK_ICONS: Record<string, string> = {
  '/handover': '📋',
  '/work': '📋',
  '/schedule': '📅',
  '/contacts': '📇',
  '/checklist': '✅',
  '/housekeeping': '🧹',
  '/amenity': '🧴',
  '/retail': '🛍',
  '/transport': '🚕',
  '/facility': '🔧',
  '/stats': '📊',
  '/settings': '⚙️',
  '/help': '❓',
};

const QUICK_LINKS = APP_NAV.filter((item) =>
  ['core', 'ops', 'insight'].includes(item.category),
).map((item) => ({
  href: item.href,
  label: item.label,
  icon: QUICK_LINK_ICONS[item.href] ?? '·',
  description: item.description,
}));

const HANDOVER_GUIDE = {
  icon: '📌',
  title: '인수인계 운영 기준 (직원 공유)',
  summary:
    '예전 엑셀처럼 상시 안내·당일 업무·공지가 한곳에 섞이지 않도록, 아래 기준으로 올립니다. 교대 인수는 「움직이는 일」만 확인합니다.',
  where: [
    { place: '팀 소식·일정', use: '공지·변경·할일·호텔 일정을 탭으로 한곳에서 확인·관리.' },
    { place: '인수인계', use: '지금 처리·넘겨야 하는 업무. 한 건 = 카드 한 장. 경과는 댓글.' },
    { place: '근무표', use: '조별 근무 CSV·휴무 신청만 (업무 일정과 분리).' },
    { place: '택시 예약', use: '픽업만 등록. 상단 바에 미완료 표시.' },
  ],
  priority: [
    { label: '🔴 긴급', hint: '즉시 확인·조치. 교대 시 ✓ 긴급 확인.' },
    { label: '🟡 오늘', hint: '오늘 안에 처리.' },
    { label: '⚪ 참고 요망', hint: '당장 손댈 필요 없음. 다음 조 참고용.' },
  ],
  shift: [
    '① 지금 근무: 상단 바에서 교대·조·담당자 선택. 우측 패널에 이름·조가 크게 표시됩니다.',
    '② 교대 시작: 우측 「교대 시작」→ 인계 탭에서 미확인 긴급·진행·보류·오늘 일정·택시만 확인.',
    '③ 근무 중: 새 이슈 → 카드 / 진행만 변경 → 댓글 / 정책 안내 → 게시판.',
    '④ 교대 인계: 근무 중 「교대 인계」🔄 → 인계 요약 화면에서 넘길 내용 정리.',
    '⑤ 교대 종료: 완료 처리 + 처리 결과, 미완료는 보류·진행 유지 + 댓글.',
  ],
  sidebar: [
    '근무 상태: 이름·조를 크게 표시. 브라우저 탭을 다시 열면 잠깐 테두리가 강조되어 「지금 누구 근무」를 확인합니다.',
    '교대 버튼: 시작 전에는 「교대 시작」만 강조, 근무 중에는 「교대 인계」가 강조됩니다.',
    '오늘 기록: [전체 | 교대 | 변경] 탭으로 필터. 아이콘·제목·담당자·시간 순으로 빠르게 훑습니다.',
    '변경 항목 클릭 → 왼쪽 목록에서 해당 카드로 스크롤·하이라이트. 길면 마우스를 올려 전체 내용 확인.',
    '더 보기 → 교대·변경 상세 모달(날짜·교대·검색 필터).',
    '이번 달 업무: 캘린더에서 할일·일정 미리보기.',
  ],
  filters: [
    `빠른 필터: ${QUICK_FILTERS.map((item) => item.label).join(' · ')}`,
    `카테고리: ${CATEGORY_OPTIONS.join(' · ')}`,
  ],
  avoid: [
    '긴 공지를 인수인계 카드에 붙여 넣지 않기',
    '한 카드에 여러 객실·여러 이슈 몰아넣지 않기',
    '택시·할일·일정을 인수인계에 중복 적지 않기',
  ],
};

const SECTIONS = [
  {
    icon: '👤',
    title: '로그인 · 지금 근무',
    body: [
      'Supabase에 등록된 이메일·비밀번호로 로그인합니다.',
      '상단 「지금 근무」에서 교대 · 조(A~E) · 담당자를 선택해야 기록이 남습니다.',
      '「오늘 근무」에서 이름을 누르면 자동 입력됩니다.',
      '헤더 「🔍 객실」로 객실 번호 통합 검색(인수인계·리뷰·HK 등).',
      '헤더 「개선 · 버그 신고」로 관리자에게 요청할 수 있습니다.',
    ],
  },
  {
    icon: '📋',
    title: '인수인계장',
    body: [
      '왼쪽: 목록·객실·인계·보관함 탭. 긴급은 우선순위로 진행중 상단에 표시됩니다.',
      '검색·기간 필터로 객실·제목·댓글·담당자를 찾습니다. 보관함도 검색에 포함됩니다.',
      '카드 드로어: 댓글·사진(2장), 할일 연동, 완료 시 처리 결과 필수.',
      '긴급 카드는 ✓ 긴급 확인 후 다음 교대로 넘깁니다.',
      '상단 바: 오늘 택시 예약·어메니티 재고 부족 등 당일 알림.',
      '우측 패널: 근무 상태·교대 버튼·오늘 기록·이번 달 캘린더 — 상단 가이드 카드 참고.',
    ],
  },
  {
    icon: '📋',
    title: '팀 소식·일정',
    body: [
      '할일·일정 / 공지·변경 / 내 할 일 탭으로 나뉩니다.',
      '할일·일정: 월 달력에서 날짜를 고르고 할일·호텔 일정을 확인·등록합니다.',
      '공지·변경: 📌 고정·유효기간 설정, 「인수인계로 등록」으로 카드 초안 생성.',
    ],
  },
  {
    icon: '📅',
    title: '근무표',
    body: [
      '조별 근무 CSV 업로드·휴무 신청만 담당합니다.',
      '인수인계 우측 「이번 달 업무」캘린더에서 당일 할일·일정을 함께 봅니다.',
    ],
  },
  {
    icon: '✅',
    title: '체크리스트',
    body: [
      '공통 | A~E조 탭으로 표시됩니다.',
      '공통 항목은 모든 조가 확인하고, 조 전용 항목은 해당 조만 체크합니다.',
      '교대 시작·종료 시 미완료 항목 수가 교대 기록에 남습니다.',
      '설정 → 체크리스트 탭에서 항목을 관리합니다.',
    ],
  },
  {
    icon: '🧹',
    title: '하우스키핑 · 어메니티 · 판매상품',
    body: [
      '하우스키핑: 층별 객실 상태·특이 객실 일별 보고. 메모에서 인수인계 카드 초안 생성 가능.',
      '어메니티: 재고·입고·출고·실사 기록. 품목별 최소 재고 설정 시 상단 알림.',
      '판매상품: 판매·배포·입고를 월별로 관리하고 실사로 마감합니다.',
      '리뷰: 긍정/부정 기록, 객실 조치 완료·취소, 「인수인계 후속」 카드 생성.',
    ],
  },
  {
    icon: '🚕',
    title: '택시 · 시설 · 물건 픽업',
    body: [
      '택시 예약: 카드형 목록·목적지별 요금·WhatsApp 전송·다국어 확인증 인쇄.',
      '진행중/완료/취소 상태, 차량번호·메모 인라인 수정. 당일 미완료는 상단 바에 표시.',
      '시설 현황: 루틴 A/B/C 템플릿, 시설 이슈 기록·해결 이력.',
      '물건 픽업 장부: 보관 물품의 인도·서명을 기록합니다.',
    ],
  },
  {
    icon: '💰',
    title: '객실료 컨펌',
    body: [
      'RAW 데이터(CSV·Excel)와 PMS보내기 파일을 업로드해 객실료를 대조합니다.',
      '예약번호 우선 매칭, 없으면 객실+날짜로 비교합니다.',
      '일치·불일치·RAW만·PMS만 결과와 차이 금액을 표로 확인합니다.',
    ],
  },
  {
    icon: '📊',
    title: '통계 · 기록 · 분석',
    body: [
      '통계: 인수인계·긴급 처리·체크리스트·할일·리뷰 후속·어메니티·HK 추이.',
      '교대 기록: 우측 오늘 기록 → 교대 탭 또는 더 보기. 교대·날짜·검색 필터.',
      '변경 기록: 오늘 기록 → 변경 탭. 카드·게시판 수정·댓글·이동 이력.',
      '층별 히트맵: 층·객실별 이슈·리뷰·HK를 색으로 비교.',
      '라이브 보드: 실시간 운영 피드를 한 화면에 표시.',
    ],
  },
  {
    icon: '🛠',
    title: '관리자 · 설정',
    body: [
      '설정: 직원·체크리스트·템플릿·메뉴 표시/숨김·피드백·데이터 초기화/샘플.',
      '메뉴 탭: 완료 카드 자동 보관 일수(0=비활성) 설정.',
      '완료 비우기·카드 삭제·데이터 초기화는 관리자만 가능합니다.',
      '숨긴 메뉴 URL 직접 접근 시 인수인계로 이동합니다(관리자 제외).',
    ],
  },
];

export function HelpPageClient() {
  return (
    <section className="project-board help-page">
      <header className="project-board__head">
        <div>
          <h1>사용 안내</h1>
          <p>현장에서 자주 쓰는 기능만 빠르게 찾을 수 있도록 정리했습니다.</p>
        </div>
      </header>

      <div className="project-board__controls help-page__quick-wrap">
        <div className="help-page__quick">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="help-quick-link"
              title={link.description}
            >
              <span aria-hidden>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <article className="help-card help-card--guide">
        <div className="help-card__head">
          <span className="help-card__icon" aria-hidden>
            {HANDOVER_GUIDE.icon}
          </span>
          <div>
            <h3>{HANDOVER_GUIDE.title}</h3>
            <p className="help-card__summary">{HANDOVER_GUIDE.summary}</p>
          </div>
        </div>

        <div className="help-guide-grid">
          <section>
            <h4>어디에 올릴까?</h4>
            <dl className="help-guide-dl">
              {HANDOVER_GUIDE.where.map((row) => (
                <div key={row.place}>
                  <dt>{row.place}</dt>
                  <dd>{row.use}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h4>우선순위</h4>
            <ul className="help-card__list">
              {HANDOVER_GUIDE.priority.map((row) => (
                <li key={row.label}>
                  <strong>{row.label}</strong> — {row.hint}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h4>교대 흐름</h4>
            <ul className="help-card__list">
              {HANDOVER_GUIDE.shift.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <section>
            <h4>인수인계 필터</h4>
            <ul className="help-card__list">
              {HANDOVER_GUIDE.filters.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <section className="help-guide-grid__wide">
            <h4>우측 패널 (교대 · 오늘 기록)</h4>
            <ul className="help-card__list">
              {HANDOVER_GUIDE.sidebar.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>

          <section>
            <h4>하지 말 것</h4>
            <ul className="help-card__list help-card__list--warn">
              {HANDOVER_GUIDE.avoid.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        </div>
      </article>

      <div className="help-page__grid">
        {SECTIONS.map((section) => (
          <article key={section.title} className="help-card">
            <div className="help-card__head">
              <span className="help-card__icon" aria-hidden>
                {section.icon}
              </span>
              <h3>{section.title}</h3>
            </div>
            <ul className="help-card__list">
              {section.body.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <aside className="help-page__aside">
        <p>
          <strong>문제가 있나요?</strong> 헤더의 <strong>개선 · 버그 신고</strong>를 눌러 관리자에게
          알려주세요.
        </p>
        <p>
          각 메뉴 상단에 한 줄 설명이 표시됩니다. 사이드바 메뉴에 마우스를 올려도 요약을 볼 수
          있습니다.
        </p>
      </aside>
    </section>
  );
}
