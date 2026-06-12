'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { printGuestNotice } from '@/lib/guest-notices/print';
import {
  GUEST_NOTICE_CATEGORIES,
  GUEST_NOTICE_LOCALE_LABELS,
  noticeBodyForLocale,
  type GuestNotice,
  type GuestNoticeCategory,
  type GuestNoticeLocale,
} from '@/lib/guest-notices/types';

type GuestNoticeFrontModeProps = {
  notices: GuestNotice[];
  initialNoticeId?: string | null;
  onExit: () => void;
  onLog: (noticeId: string, action: 'viewed' | 'printed' | 'confirmed') => Promise<void>;
};

function isNoticeActive(notice: GuestNotice, today: string): boolean {
  if (notice.status !== 'published') return false;
  if (notice.valid_from && notice.valid_from > today) return false;
  if (notice.valid_until && notice.valid_until < today) return false;
  return true;
}

function buildNoticeShareUrl(noticeId: string): string {
  if (typeof window === 'undefined') return `/guest-notices?mode=front&id=${noticeId}`;
  const url = new URL(window.location.href);
  url.searchParams.set('mode', 'front');
  url.searchParams.set('id', noticeId);
  return url.toString();
}

export function GuestNoticeFrontMode({
  notices,
  initialNoticeId,
  onExit,
  onLog,
}: GuestNoticeFrontModeProps) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const published = useMemo(
    () => notices.filter((notice) => isNoticeActive(notice, today)),
    [notices, today],
  );
  const [category, setCategory] = useState<'all' | GuestNoticeCategory>('all');
  const [selectedId, setSelectedId] = useState<string | null>(initialNoticeId ?? null);
  const [locale, setLocale] = useState<GuestNoticeLocale>('ko');
  const [showQr, setShowQr] = useState(false);
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const viewedRef = useRef<Set<string>>(new Set());
  const onLogRef = useRef(onLog);
  onLogRef.current = onLog;

  const filtered = useMemo(() => {
    if (category === 'all') return published;
    return published.filter((notice) => notice.category === category);
  }, [published, category]);

  const selected = filtered.find((notice) => notice.id === selectedId) ?? filtered[0] ?? null;

  useEffect(() => {
    setSelectedId((current) => {
      if (!filtered.length) return null;
      if (current && filtered.some((notice) => notice.id === current)) return current;
      return filtered[0].id;
    });
  }, [filtered]);

  useEffect(() => {
    if (!selected?.id) return;
    if (viewedRef.current.has(selected.id)) return;
    viewedRef.current.add(selected.id);
    void onLogRef.current(selected.id, 'viewed');
  }, [selected?.id]);

  async function handleCopy() {
    if (!selected) return;
    const text = `${selected.title}\n\n${noticeBodyForLocale(selected, locale)}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopyNote('클립보드에 복사했습니다.');
    } catch {
      setCopyNote('복사에 실패했습니다.');
    }
    window.setTimeout(() => setCopyNote(null), 2000);
  }

  return (
    <div className="guest-front">
      <header className="guest-front__topbar">
        <div>
          <strong>프런트 모드</strong>
          <span>고객 안내 빠른 표시</span>
        </div>
        <button type="button" className="btn btn--ghost" onClick={onExit}>
          관리 화면
        </button>
      </header>

      <div className="guest-front__layout">
        <aside className="guest-front__sidebar">
          <div className="guest-front__categories" role="tablist" aria-label="분류">
            <button
              type="button"
              className={`guest-front__chip${category === 'all' ? ' is-active' : ''}`}
              onClick={() => setCategory('all')}
            >
              전체
            </button>
            {GUEST_NOTICE_CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                className={`guest-front__chip${category === item ? ' is-active' : ''}`}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <ul className="guest-front__list">
            {filtered.map((notice) => (
              <li key={notice.id}>
                <button
                  type="button"
                  className={`guest-front__list-item${selected?.id === notice.id ? ' is-active' : ''}`}
                  onClick={() => setSelectedId(notice.id)}
                >
                  <span className="guest-front__list-category">{notice.category}</span>
                  <strong>{notice.title}</strong>
                </button>
              </li>
            ))}
          </ul>
          {!filtered.length ? <p className="guest-front__empty">게시 중인 안내문이 없습니다.</p> : null}
        </aside>

        <main className="guest-front__stage">
          {selected ? (
            <>
              <div className="guest-front__stage-head">
                <div>
                  <span className="guest-front__stage-category">{selected.category}</span>
                  <h1>{selected.title}</h1>
                </div>
                <div className="guest-notice-drawer__locales" role="radiogroup" aria-label="언어">
                  {(Object.keys(GUEST_NOTICE_LOCALE_LABELS) as GuestNoticeLocale[]).map((code) => (
                    <button
                      key={code}
                      type="button"
                      role="radio"
                      aria-checked={locale === code}
                      className={`guest-notice-drawer__locale${locale === code ? ' is-active' : ''}`}
                      onClick={() => setLocale(code)}
                    >
                      {GUEST_NOTICE_LOCALE_LABELS[code]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="guest-front__body">{noticeBodyForLocale(selected, locale)}</div>

              <div className="guest-front__actions">
                <button type="button" className="btn btn--primary" onClick={() => void handleCopy()}>
                  본문 복사
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={async () => {
                    printGuestNotice(selected, locale);
                    await onLog(selected.id, 'printed');
                  }}
                >
                  인쇄
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => setShowQr((v) => !v)}>
                  QR
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={async () => {
                    await onLog(selected.id, 'confirmed');
                  }}
                >
                  안내 완료
                </button>
              </div>

              {copyNote ? <p className="guest-front__note">{copyNote}</p> : null}

              {showQr ? (
                <div className="guest-front__qr">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(buildNoticeShareUrl(selected.id))}`}
                    alt="안내문 공유 QR"
                    width={180}
                    height={180}
                  />
                  <p>태블릿·모바일에서 같은 안내문을 열 때 스캔하세요.</p>
                </div>
              ) : null}
            </>
          ) : (
            <p className="guest-front__empty">표시할 안내문을 선택하세요.</p>
          )}
        </main>
      </div>
    </div>
  );
}
