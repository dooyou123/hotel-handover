'use client';

import Link from 'next/link';

const QUICK_LINKS = [
  { href: '/handover', label: '인수인계', icon: '📋' },
  { href: '/notices', label: '게시판', icon: '📢' },
  { href: '/todos', label: '할일', icon: '☑' },
  { href: '/checklist', label: '체크리스트', icon: '✅' },
  { href: '/schedule', label: '일정', icon: '📅' },
  { href: '/stats', label: '통계', icon: '📊' },
  { href: '/settings', label: '설정', icon: '⚙️' },
];

const SECTIONS = [
  {
    icon: '👤',
    title: '로그인 · 지금 근무',
    body: [
      'Supabase에 등록된 이메일·비밀번호로 로그인합니다.',
      '상단 「지금 근무」에서 교대 · 조(A/B/C) · 담당자를 선택해야 기록이 남습니다.',
      '「오늘 근무」에서 이름을 누르면 자동 입력됩니다.',
      '헤더 「개선 · 버그 신고」로 관리자에게 요청할 수 있습니다.',
    ],
  },
  {
    icon: '📋',
    title: '인수인계장',
    body: [
      '왼쪽 70%: 진행중·완료·보관 목록. 긴급은 우선순위로 상단에 표시됩니다.',
      '검색은 보관함 왼쪽 — 객실·제목·댓글·담당자·기간(「기간」 버튼)으로 필터합니다.',
      '오른쪽 패널: 업무 현황, 교대·기록, 고정 공지(클릭 시 인수인계 등록), 오늘 할일·일정.',
      '카드 드로어: 댓글·사진(2장), 할일 연동, 완료 시 처리 결과 필수.',
      '긴급 카드는 ✓ 긴급 확인 후 다음 교대로 넘깁니다.',
    ],
  },
  {
    icon: '📢',
    title: '게시판',
    body: [
      '업무 공지 / 업무 변경 글을 작성합니다. 📌 고정·유효기간 설정 가능.',
      '상세 드로어 「인수인계로 등록」 또는 목록 → 버튼으로 인수인계 초안을 만듭니다.',
      '관리자만 삭제할 수 있습니다.',
    ],
  },
  {
    icon: '☑',
    title: '할일 · 일정',
    body: [
      '할일: 우선순위·마감·담당자. 인수인계 카드와 양방향 연동됩니다.',
      '일정: 호텔 이벤트(VIP·회의 등) + 근무표 CSV 업로드.',
      '오늘 패널에서 할일·일정을 바로 열 수 있습니다.',
    ],
  },
  {
    icon: '✅',
    title: '체크리스트 A/B/C',
    body: [
      '공통 | A조 | B조 | C조 2열 그리드로 표시됩니다.',
      '공통 항목은 모든 조가 확인하고, 조 전용 항목은 해당 조만 체크합니다.',
      '설정 → 체크리스트 탭에서 항목을 관리합니다.',
    ],
  },
  {
    icon: '🧹',
    title: '하우스키핑 · 어메니티 · 리뷰',
    body: [
      '하우스키핑: 4~13층 EB·특이 객실 일별 보고, 인쇄 가능.',
      '어메니티: 재고·입출고, Realtime 동기화.',
      '리뷰: 긍정/부정 기록 후 「인수인계 후속」으로 카드를 만들 수 있습니다.',
    ],
  },
  {
    icon: '📊',
    title: '통계 · 변경 기록',
    body: [
      '통계: 인수인계·긴급 처리·체크리스트·할일·리뷰 후속·어메니티·HK EB 추이.',
      '변경 기록: 인수인계 화면 「기록」— 유형·동작·검색 필터, Realtime 갱신.',
    ],
  },
  {
    icon: '🛠',
    title: '관리자 · 설정',
    body: [
      '설정: 직원·체크리스트·템플릿·메뉴 표시/숨김·피드백·데이터 초기화/샘플.',
      '완료 비우기·카드 삭제·데이터 초기화는 관리자만 가능합니다.',
      '숨긴 메뉴 URL 직접 접근 시 인수인계로 이동합니다(관리자 제외).',
    ],
  },
];

export function HelpPageClient() {
  return (
    <section className="help-page">
      <div className="help-page__hero">
        <div>
          <h2>사용 안내</h2>
          <p>현장에서 자주 쓰는 기능만 빠르게 찾을 수 있도록 정리했습니다.</p>
        </div>
        <div className="help-page__quick">
          {QUICK_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="help-quick-link">
              <span aria-hidden>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>
      </div>

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
      </aside>
    </section>
  );
}
