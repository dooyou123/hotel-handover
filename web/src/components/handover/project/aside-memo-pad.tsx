'use client';

import { useEffect, useRef, useState } from 'react';
import { formatRelativeTime } from '@/lib/handover/card-utils';
import { useStaffMemoPad } from '@/lib/personal-tasks/use-staff-memo-pad';

type AsideMemoPadProps = {
  staffName: string;
};

const AUTOSAVE_DELAY_MS = 800;

/**
 * 이름별 개인 메모장 — "아직 카드로 만들 정도는 아니지만 잊으면 안 되는 것"을
 * 적어 두는 자리. 입력을 멈추면 자동 저장되고, 같은 이름이면 어느 기기에서든 보인다.
 */
export function AsideMemoPad({ staffName }: AsideMemoPadProps) {
  const { content, updatedAt, isLoading, schemaMissing, saveMemo } = useStaffMemoPad(staffName);
  const [draft, setDraft] = useState('');
  const [dirty, setDirty] = useState(false);
  const timerRef = useRef<number | null>(null);
  const lastNameRef = useRef(staffName);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 내용에 맞춰 높이를 자동으로 늘려 전체가 한눈에 보이게 한다 (Firefox 포함 전 브라우저)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight + 2}px`;
  }, [draft, isLoading]);

  // "x분 전" 표기가 시간이 지나도 갱신되도록 1분마다 다시 그린다
  const [, setClockTick] = useState(0);
  useEffect(() => {
    const interval = window.setInterval(() => setClockTick((tick) => tick + 1), 60_000);
    return () => window.clearInterval(interval);
  }, []);

  // 서버 값 반영 — 이름이 바뀌었거나, 수정 중이 아닐 때만 (입력 중 덮어쓰기 방지)
  useEffect(() => {
    if (lastNameRef.current !== staffName) {
      lastNameRef.current = staffName;
      setDraft(content);
      setDirty(false);
      return;
    }
    if (!dirty) setDraft(content);
  }, [content, staffName, dirty]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  if (!staffName) return null;

  function scheduleSave(next: string) {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      saveMemo.mutate(next, { onSuccess: () => setDirty(false) });
    }, AUTOSAVE_DELAY_MS);
  }

  function handleChange(next: string) {
    setDraft(next);
    setDirty(true);
    scheduleSave(next);
  }

  function flushSave() {
    if (!dirty) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    saveMemo.mutate(draft, { onSuccess: () => setDirty(false) });
  }

  const savedTime = updatedAt ? formatRelativeTime(updatedAt) : null;
  const status = saveMemo.isPending
    ? '저장 중…'
    : dirty
      ? '입력 중…'
      : savedTime && (draft.trim() || content.trim())
        ? `${savedTime.label} 저장됨`
        : '';

  return (
    <section className="aside-card aside-card--memo">
      <div className="aside-card__head">
        <h3 className="aside-card__title">내 메모</h3>
        {status ? (
          <span className="aside-memo__status" title={savedTime?.title}>
            {status}
          </span>
        ) : null}
      </div>
      {schemaMissing ? (
        <p className="aside-memo__hint">
          DB 마이그레이션 <code>101_staff_memo_pads.sql</code> 적용이 필요합니다.
        </p>
      ) : (
        <>
          <textarea
            ref={textareaRef}
            className="aside-memo__textarea"
            rows={7}
            value={draft}
            onChange={(event) => handleChange(event.target.value)}
            onBlur={flushSave}
            placeholder={isLoading ? '불러오는 중…' : '나만 보는 메모 — 잊으면 안 되는 것들'}
            disabled={isLoading}
            aria-label={`${staffName}의 개인 메모`}
          />
          <p className="aside-memo__hint">이름 기준으로 저장되어 어느 기기에서든 보입니다.</p>
        </>
      )}
    </section>
  );
}
