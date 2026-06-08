export const SHIFT_BRIEF_PATH = '/shift-brief';

export function openShiftBriefWindow(): boolean {
  if (typeof window === 'undefined') return false;
  window.open(
    SHIFT_BRIEF_PATH,
    'shift-brief',
    'width=1180,height=900,menubar=no,toolbar=no,location=no,status=no',
  );
  return true;
}
