'use client';

import { useEffect, useState } from 'react';
import {
  CONFIGURABLE_NAV,
  saveHiddenNavHrefs,
  useHiddenNavHrefs,
} from '@/lib/settings/nav-visibility';

type NavVisibilityPanelProps = {
  onSaved?: () => void;
};

export function NavVisibilityPanel({ onSaved }: NavVisibilityPanelProps) {
  const { data: hiddenHrefs = [], isLoading, refetch } = useHiddenNavHrefs();
  const [draftHidden, setDraftHidden] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraftHidden(new Set(hiddenHrefs));
  }, [hiddenHrefs]);

  function toggleHref(href: string, visible: boolean) {
    setDraftHidden((prev) => {
      const next = new Set(prev);
      if (visible) next.delete(href);
      else next.add(href);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await saveHiddenNavHrefs([...draftHidden]);
      await refetch();
      onSaved?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  const dirty =
    draftHidden.size !== hiddenHrefs.length || hiddenHrefs.some((href) => !draftHidden.has(href));

  if (isLoading) {
    return <p className="empty-state">불러오는 중…</p>;
  }

  return (
    <article className="schedule-panel nav-visibility-panel">
      <div className="schedule-panel__header">
        <div>
          <h3>사이드바 메뉴</h3>
          <p>
            아직 공개하지 않을 화면은 체크를 해제해 숨깁니다. <strong>인수인계</strong>와{' '}
            <strong>설정</strong>은 항상 표시됩니다. 변경 사항은 호텔 전체 직원에게 적용됩니다.
          </p>
          <p className="nav-visibility-legend">
            사이드바 아이콘:{' '}
            <span className="nav-staff-visibility nav-staff-visibility--on" title="직원 표시">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
              </svg>
            </span>{' '}
            직원 표시 ·{' '}
            <span className="nav-staff-visibility nav-staff-visibility--off" title="직원 숨김">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M3 3l18 18M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-4.4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </span>{' '}
            직원 숨김
          </p>
        </div>
      </div>

      <ul className="nav-visibility-list">
        {CONFIGURABLE_NAV.map((item) => {
          const visible = !draftHidden.has(item.href);
          return (
            <li key={item.href}>
              <label className="nav-visibility-row">
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={(event) => toggleHref(item.href, event.target.checked)}
                />
                <span className="nav-visibility-row__label">{item.label}</span>
                <span className="nav-visibility-row__path">{item.href}</span>
              </label>
            </li>
          );
        })}
      </ul>

      {error ? <p className="amenity-alert">{error}</p> : null}

      <div className="settings-panel__actions">
        <button type="button" className="btn btn--primary" disabled={!dirty || saving} onClick={handleSave}>
          {saving ? '저장 중…' : '메뉴 설정 저장'}
        </button>
      </div>
    </article>
  );
}
