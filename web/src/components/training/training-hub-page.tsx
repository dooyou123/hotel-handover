'use client';

import Link from 'next/link';

const TRAINING_MODULES = [
  {
    href: '/training/emergency',
    icon: '🚨',
    title: '긴급 상황 대응 가이드',
    description: '화재·응급·누수·정전·보안·엘리베이터·가스 7가지 시나리오 체크리스트',
    tags: ['체크리스트', '연락처', '인계 템플릿'],
  },
  {
    href: '/training/complaint',
    icon: '💬',
    title: '컴플레인 롤플레이',
    description: '분기형 시나리오로 응대 연습 · SLA·보상 기준 · 점수·카드 제안',
    tags: ['롤플레이', 'SLA 30분/24h', 'remedies'],
  },
] as const;

export function TrainingHubPage() {
  return (
    <section className="project-board training-page training-hub">
      <header className="project-board__head">
        <div>
          <h1>프런트 교육</h1>
          <p>신입·교대 전 프런트 데스크 교육용 시뮬레이션입니다. 실제 현장 연락처는 호텔 설정을 따르세요.</p>
        </div>
      </header>

      <div className="training-hub-grid">
        {TRAINING_MODULES.map((mod) => (
          <Link key={mod.href} href={mod.href} className="training-hub-card">
            <span className="training-hub-card__icon" aria-hidden>
              {mod.icon}
            </span>
            <h2>{mod.title}</h2>
            <p>{mod.description}</p>
            <ul className="training-hub-card__tags">
              {mod.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
            <span className="training-hub-card__cta">시작하기 →</span>
          </Link>
        ))}
      </div>

      <aside className="training-panel training-panel--hint">
        <h3>활용 팁</h3>
        <ul className="training-tips">
          <li>교대 시작 전 10분 — 긴급 가이드에서 해당 시즌 이슈(누수·정전 등)만 훑어보기</li>
          <li>컴플레인 롤플레이 — 70점 미만이면 같은 시나리오 재도전</li>
          <li>롤플레이 결과 카드는 <Link href="/handover">인수인계</Link> 등록 연습용이며 실제 카드가 자동 생성되지는 않습니다</li>
        </ul>
      </aside>
    </section>
  );
}
