'use client';

import Link from 'next/link';

const QUICK_LINKS = [
  { href: '/handover', label: '인수인계', icon: '📋' },
  { href: '/checklist', label: '체크리스트', icon: '✅' },
  { href: '/schedule', label: '스케줄', icon: '📅' },
  { href: '/housekeeping', label: '하우스키핑', icon: '🧹' },
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
    title: '인수인계 보드',
    body: [
      '긴급 / 진행중 / 완료 3칸 칸반. 카드를 드래그해 상태를 바꿉니다.',
      '긴급 칸은 ✓ 긴급 확인 후 다음 교대로 넘깁니다.',
      '검색·카테고리·일일 요약·변경 기록은 상단 오른쪽 도구 모음에 있습니다.',
    ],
  },
  {
    icon: '✅',
    title: '체크리스트 A/B/C',
    body: [
      '공통 항목은 A/B/C 조 모두 확인합니다.',
      'A조·B조·C조 전용 항목은 해당 조만 체크합니다.',
      '설정 → 체크리스트 탭에서 공통·조별 항목을 관리합니다.',
    ],
  },
  {
    icon: '🧹',
    title: '하우스키핑 리포트',
    body: [
      '4~13층 02·10·16호 객실의 트윈/트리플·엑스트라베드 넣음/뺌을 날짜별로 작성합니다.',
      '특이 객실에 일찍 체크인·VIP·장박을 추가할 수 있습니다.',
      '「인쇄」로 하우스키핑 전달용 서류를 출력합니다.',
    ],
  },
  {
    icon: '📊',
    title: '통계',
    body: [
      '통계 탭에서 주간(7일)·월간(30일) 인수인계·긴급 처리·어메니티 소모를 확인합니다.',
      '긴급 처리 시간은 등록 후 첫 확인 또는 완료 이동까지의 평균입니다.',
    ],
  },
  {
    icon: '🛠',
    title: '관리자 · 문제 해결',
    body: [
      '설정에서 체크리스트·신고 확인은 관리자만, 직원·템플릿은 모든 직원이 관리할 수 있습니다. 완료칸 비우기·카드 삭제는 관리자만 가능합니다.',
      '설정이 안 보이면 profiles.role = manager 확인 후 재로그인.',
      '스케줄 오류 시 HOTEL_ID 환경 변수를 확인하세요.',
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
