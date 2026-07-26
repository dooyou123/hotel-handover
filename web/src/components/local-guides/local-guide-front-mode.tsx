'use client';

import { useEffect, useMemo, useState } from 'react';
import { printLocalGuide } from '@/lib/local-guides/print';
import {
  LOCAL_GUIDE_KIND_LABELS,
  LOCAL_GUIDE_KINDS,
  LOCAL_GUIDE_LOCALE_LABELS,
  guideBodyForLocale,
  type LocalGuide,
  type LocalGuideKind,
  type LocalGuideLocale,
} from '@/lib/local-guides/types';

type LocalGuideFrontModeProps = {
  guides: LocalGuide[];
  initialGuideId?: string | null;
  onExit: () => void;
};

export function LocalGuideFrontMode({ guides, initialGuideId, onExit }: LocalGuideFrontModeProps) {
  const active = useMemo(() => guides.filter((guide) => guide.is_active), [guides]);
  const [kind, setKind] = useState<'all' | LocalGuideKind>('all');
  const [selectedId, setSelectedId] = useState<string | null>(initialGuideId ?? null);
  const [locale, setLocale] = useState<LocalGuideLocale>('ko');
  const [copyNote, setCopyNote] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (kind === 'all') return active;
    return active.filter((guide) => guide.kind === kind);
  }, [active, kind]);

  const selected = filtered.find((guide) => guide.id === selectedId) ?? filtered[0] ?? null;

  useEffect(() => {
    setSelectedId((current) => {
      if (!filtered.length) return null;
      if (current && filtered.some((guide) => guide.id === current)) return current;
      return filtered[0].id;
    });
  }, [filtered]);

  async function handleCopy() {
    if (!selected) return;
    const text = `${selected.title}\n\n${guideBodyForLocale(selected, locale)}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopyNote('복사했습니다.');
    } catch {
      setCopyNote('복사에 실패했습니다.');
    }
    window.setTimeout(() => setCopyNote(null), 1800);
  }

  return (
    <div className="local-guide-front">
      <header className="local-guide-front__topbar">
        <div>
          <strong>퀵가이드</strong>
          <span>손님에게 바로 보여주세요</span>
        </div>
        <div className="local-guide-front__top-actions">
          <div className="local-guide-front__locale" role="group" aria-label="언어">
            {(Object.keys(LOCAL_GUIDE_LOCALE_LABELS) as LocalGuideLocale[]).map((code) => (
              <button
                key={code}
                type="button"
                className={locale === code ? 'is-active' : undefined}
                onClick={() => setLocale(code)}
              >
                {LOCAL_GUIDE_LOCALE_LABELS[code]}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--ghost" onClick={onExit}>
            나가기
          </button>
        </div>
      </header>

      <div className="local-guide-front__kinds" role="tablist" aria-label="구분">
        <button
          type="button"
          role="tab"
          aria-selected={kind === 'all'}
          className={kind === 'all' ? 'is-active' : undefined}
          onClick={() => setKind('all')}
        >
          전체
        </button>
        {LOCAL_GUIDE_KINDS.map((code) => (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={kind === code}
            className={kind === code ? 'is-active' : undefined}
            onClick={() => setKind(code)}
          >
            {LOCAL_GUIDE_KIND_LABELS[code]}
          </button>
        ))}
      </div>

      <div className="local-guide-front__body">
        <aside className="local-guide-front__list" aria-label="안내 목록">
          {filtered.length ? (
            filtered.map((guide) => (
              <button
                key={guide.id}
                type="button"
                className={`local-guide-front__item${selected?.id === guide.id ? ' is-active' : ''}`}
                onClick={() => setSelectedId(guide.id)}
              >
                <em>{LOCAL_GUIDE_KIND_LABELS[guide.kind]}</em>
                <strong>{guide.title}</strong>
              </button>
            ))
          ) : (
            <p className="local-guide-front__empty">표시할 안내가 없습니다.</p>
          )}
        </aside>

        <section className="local-guide-front__panel" aria-live="polite">
          {selected ? (
            <>
              <div className="local-guide-front__panel-head">
                <span className={`local-guide-chip local-guide-chip--${selected.kind}`}>
                  {LOCAL_GUIDE_KIND_LABELS[selected.kind]}
                </span>
                <h2>{selected.title}</h2>
              </div>
              <div className="local-guide-front__panel-body">
                {guideBodyForLocale(selected, locale)
                  .split('\n')
                  .map((line, index) => (
                    <p key={`${selected.id}-${index}`}>{line || '\u00a0'}</p>
                  ))}
              </div>
              <div className="local-guide-front__panel-actions">
                <button type="button" className="btn btn--ghost" onClick={() => void handleCopy()}>
                  복사
                </button>
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={() => printLocalGuide(selected, locale)}
                >
                  인쇄
                </button>
                {copyNote ? <span className="local-guide-front__note">{copyNote}</span> : null}
              </div>
            </>
          ) : (
            <p className="local-guide-front__empty">왼쪽에서 안내를 선택하세요.</p>
          )}
        </section>
      </div>
    </div>
  );
}
