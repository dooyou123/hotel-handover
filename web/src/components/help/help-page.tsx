'use client';

const SECTIONS = [
  {
    title: '1. 로그인 · 지금 근무',
    body: [
      'Supabase에 등록된 이메일·비밀번호로 로그인합니다. (자가 가입 없음)',
      '상단 「지금 근무」에서 교대(주간/오후/야간)와 담당자 이름을 선택해야 카드 추가·긴급 확인·체크리스트 기록이 가능합니다.',
      '「오늘 근무」에서 이름을 누르면 「지금 근무」에 자동 입력됩니다.',
    ],
  },
  {
    title: '2. 인수인계 보드',
    body: [
      '긴급 / 진행중 / 완료 3칸 칸반. 카드를 드래그해 칸을 바꿀 수 있습니다.',
      '긴급 칸 카드는 ✓ 긴급 확인을 눌러야 다음 교대에 넘어갑니다.',
      '+ 새 인수인계 · 일일 요약 · 변경 기록은 상단 검색줄 오른쪽에 있습니다.',
    ],
  },
  {
    title: '3. 매니저 · 문제 해결',
    body: [
      '설정 탭·완료칸 비우기·삭제는 매니저(role=manager)만 가능합니다.',
      '스케줄 400 → HOTEL_ID 확인. 설정 불가 → profiles.role 확인 후 재로그인.',
    ],
  },
];

export function HelpPageClient() {
  return (
    <div>
      <section className="schedule-page__intro">
        <h2>프런트 인수인계 보드 — 사용 안내</h2>
        <p>UAT·현장 교육용 요약입니다.</p>
      </section>

      <div className="settings-grid">
        {SECTIONS.map((section) => (
          <section key={section.title} className="schedule-panel">
            <h3>{section.title}</h3>
            <ul style={{ margin: '0.75rem 0 0', paddingLeft: '1.2rem' }}>
              {section.body.map((line) => (
                <li key={line} style={{ marginBottom: '0.35rem' }}>
                  {line}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
