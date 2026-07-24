'use client';

import { useMemo, useState } from 'react';

type GuestHowToGuideProps = {
  variant?: 'gate' | 'workspace';
};

function todayParts(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return {
    label: `${now.getMonth() + 1}월 ${now.getDate()}일`,
    ymd: `${y}${m}${d}`,
  };
}

const GATE_STEPS = [
  {
    title: '허용 메일 등록',
    body: '관리자가 「객실료 컨펌」에서 받을 수 있는 이메일을 등록합니다.',
  },
  {
    title: '일회용 PIN 받기',
    body: '게스트 화면에서 그 메일을 입력하면 15분짜리 일회용 PIN이 메일로 옵니다.',
  },
  {
    title: 'PIN으로 입장',
    body: '받은 PIN을 입력해 입장합니다. 파일은 브라우저에서만 읽고 서버로 올라가지 않습니다.',
  },
];

export function GuestHowToGuide({ variant = 'workspace' }: GuestHowToGuideProps) {
  const today = useMemo(() => todayParts(), []);
  const [open, setOpen] = useState(true);

  const workspaceSteps = [
    {
      title: '① 담당자 이름',
      body: '맨 위 「담당자 이름」에 본인 이름을 적으세요. 이름이 있어야 대조 결과가 자동 저장되고, 처리 기록도 남길 수 있습니다.',
    },
    {
      title: '② 오늘 체크인 자료 받기',
      body: `오늘이 ${today.label}이면, TL·PMS 모두 「${today.label} 체크인」으로 검색·보내기한 파일만 사용하세요. 날짜가 다른 파일끼리는 대조하지 않습니다.`,
    },
    {
      title: '③ 파일 업로드',
      body: `왼쪽 TL: 예약검색${today.ymd}….csv 형식 · 오른쪽 PMS: Reservation+List_${today.ymd}-1.xlsx 형식. 아래 업로드 칸의 예시 파일명을 그대로 참고하세요.`,
    },
    {
      title: '④ 열 매핑 확인',
      body: '대부분 자동으로 맞춰집니다. 예약번호·객실료 열이 비어 있으면 「열 매핑 설정」에서 직접 고르세요.',
    },
    {
      title: '⑤ 결과·처리',
      body: '불일치 건을 확인하고, 테이블에서 건마다 처리 기록을 남기세요. 「이력」탭에서 지난 대조를 다시 열 수 있습니다.',
    },
  ];

  const steps = variant === 'gate' ? GATE_STEPS : workspaceSteps;

  return (
    <section className={`rc-guest-howto${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="rc-guest-howto__toggle"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>
          <strong>{variant === 'gate' ? '게스트 이용 안내' : '사용 방법'}</strong>
          <em>
            {variant === 'gate'
              ? '입장 전에 한 번 읽어 주세요'
              : `오늘(${today.label}) 체크인 파일만 · 파일명 예시 확인`}
          </em>
        </span>
        <span className="rc-guest-howto__chevron" aria-hidden>
          {open ? '▾' : '▸'}
        </span>
      </button>

      {open ? (
        <ol className="rc-guest-howto__steps">
          {steps.map((step) => (
            <li key={step.title}>
              <strong>{step.title}</strong>
              <p>{step.body}</p>
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}
