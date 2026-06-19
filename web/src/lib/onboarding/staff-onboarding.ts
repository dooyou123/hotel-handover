export const STAFF_ONBOARDING_STORAGE_KEY = 'handover-onboarding-v1';

export type StaffOnboardingStep = 1 | 2 | 3;

export const STAFF_ONBOARDING_STEPS: {
  step: StaffOnboardingStep;
  title: string;
  body: string;
  tip?: string;
}[] = [
  {
    step: 1,
    title: '지금 근무 설정',
    body: '상단 바에서 조(A~E)와 담당자 이름을 선택하세요. 카드 작성·완료·댓글에 이름이 기록됩니다.',
    tip: '「오늘 근무」에서 이름을 누르면 자동으로 채워집니다.',
  },
  {
    step: 2,
    title: '인수인계 카드',
    body: '지금 넘겨야 할 업무는 카드 한 장 = 한 건입니다. 긴급은 ✓ 확인 후 다음 교대로 넘깁니다.',
    tip: '긴 공지·정책은 게시판, 할일·택시는 각 메뉴에 올리세요.',
  },
  {
    step: 3,
    title: '교대 흐름',
    body: '교대 시작 → 근무 중 카드/댓글 → 교대 인계 요약 → 교대 종료. 우측 패널(모바일: 패널 탭)에서 버튼을 사용합니다.',
    tip: '자세한 안내는 사이드바 「도움말」을 참고하세요.',
  },
];

export function isStaffOnboardingComplete(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(STAFF_ONBOARDING_STORAGE_KEY) === 'done';
}

export function markStaffOnboardingComplete() {
  localStorage.setItem(STAFF_ONBOARDING_STORAGE_KEY, 'done');
}

export function shouldShowStaffOnboarding(sessionComplete: boolean): boolean {
  if (typeof window === 'undefined') return false;
  if (isStaffOnboardingComplete()) return false;
  return !sessionComplete;
}
