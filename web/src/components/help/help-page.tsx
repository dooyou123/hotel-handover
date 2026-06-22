'use client';

import Link from 'next/link';
import {
  CORE_FEATURE_GUIDES,
  GETTING_STARTED_STEPS,
  HANDOVER_RULES,
} from '@/lib/help/getting-started-guide';

export function HelpPageClient() {
  return (
    <section className="project-board help-page">
      <header className="project-board__head">
        <div>
          <h1>처음 시작하기</h1>
          <p>
            호텔 인수인계 웹앱을 처음 쓰는 분을 위한 안내입니다. 현장에서 쓰는{' '}
            <strong>9가지 핵심 메뉴</strong>만 정리했습니다.
          </p>
        </div>
      </header>

      <article className="help-page__hero">
        <div>
          <h2>3단계로 시작</h2>
          <p>로그인 → 지금 근무 설정 → 필요한 메뉴로 이동</p>
        </div>
        <Link href="/handover" className="btn btn--primary btn--small">
          인수인계로 이동
        </Link>
      </article>

      <div className="help-page__quick-wrap">
        <p className="help-page__section-head">
          <strong>프런트 교육</strong> — 신입·교대 전 시뮬레이션
        </p>
        <div className="help-page__quick">
          <Link href="/training" className="help-quick-link">
            교육 허브
          </Link>
          <Link href="/training/emergency" className="help-quick-link">
            긴급 대응 가이드
          </Link>
          <Link href="/training/complaint" className="help-quick-link">
            컴플레인 롤플레이
          </Link>
        </div>
      </div>

      <ol className="help-start-steps">
        {GETTING_STARTED_STEPS.map((item) => (
          <li key={item.step} className="help-start-step">
            <span className="help-start-step__num" aria-hidden>
              {item.step}
            </span>
            <div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="help-page__section-head">
        <h2>9가지 핵심 메뉴</h2>
        <p>각 카드를 누르면 해당 화면으로 이동합니다.</p>
      </div>

      <div className="help-features-grid">
        {CORE_FEATURE_GUIDES.map((feature, index) => (
          <Link key={feature.href} href={feature.href} className="help-feature-card">
            <header className="help-feature-card__head">
              <span className="help-feature-card__index" aria-hidden>
                {index + 1}
              </span>
              <span className="help-feature-card__icon" aria-hidden>
                {feature.icon}
              </span>
              <div>
                <h3>{feature.title}</h3>
                <p className="help-feature-card__tagline">{feature.tagline}</p>
              </div>
            </header>
            <p className="help-feature-card__when">
              <strong>언제 쓰나요?</strong> {feature.when}
            </p>
            <ul className="help-feature-card__tips">
              {feature.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
            <span className="help-feature-card__cta">메뉴 열기 →</span>
          </Link>
        ))}
      </div>

      <article className="help-card help-card--guide">
        <div className="help-card__head">
          <span className="help-card__icon" aria-hidden>
            📌
          </span>
          <div>
            <h3>기록은 어디에?</h3>
            <p className="help-card__summary">
              예전 엑셀처럼 모든 내용을 한곳에 적지 않습니다. 아래 기준으로 나누면 교대 인수가
              빨라집니다.
            </p>
          </div>
        </div>

        <div className="help-guide-grid help-guide-grid--compact">
          <section>
            <h4>메뉴별 역할</h4>
            <dl className="help-guide-dl">
              {HANDOVER_RULES.where.map((row) => (
                <div key={row.place}>
                  <dt>{row.place}</dt>
                  <dd>{row.use}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section>
            <h4>하지 말 것</h4>
            <ul className="help-card__list help-card__list--warn">
              {HANDOVER_RULES.avoid.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        </div>
      </article>

      <aside className="help-page__aside">
        <p>
          <strong>헤더 바로가기</strong> — 🔍 객실 검색(인수인계·리뷰 등 통합), 개선 · 버그
          신고(관리자에게 전달)
        </p>
        <p>
          <strong>문제가 있나요?</strong> 헤더의 <strong>개선 · 버그 신고</strong>를 눌러
          알려주세요.
        </p>
      </aside>
    </section>
  );
}
