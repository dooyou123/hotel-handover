'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { printGuestNotice } from '@/lib/guest-notices/print';
import {
  GUEST_NOTICE_CATEGORIES,
  GUEST_NOTICE_LOCALE_LABELS,
  GUEST_NOTICE_LOG_LABELS,
  GUEST_NOTICE_STATUS_LABELS,
  noticeBodyForLocale,
  type GuestNotice,
  type GuestNoticeInput,
  type GuestNoticeLocale,
  type GuestNoticeStatus,
} from '@/lib/guest-notices/types';
import { useGuestNoticeLogs, useGuestNotices } from '@/lib/guest-notices/use-guest-notices';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';

type DrawerMode = 'read' | 'edit' | 'create';

const emptyInput = (author: string): GuestNoticeInput => ({
  title: '',
  category: '안내',
  status: 'draft',
  body_ko: '',
  body_en: '',
  body_zh: '',
  body_ja: '',
  valid_from: null,
  valid_until: null,
  author,
});

function formatDateLabel(value: string | null): string {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('ko-KR');
}

function localeBodyKey(locale: GuestNoticeLocale): 'body_ko' | 'body_en' | 'body_zh' | 'body_ja' {
  if (locale === 'en') return 'body_en';
  if (locale === 'zh') return 'body_zh';
  if (locale === 'ja') return 'body_ja';
  return 'body_ko';
}

function GuestNoticeDrawer({
  open,
  mode,
  notice,
  authorLabel,
  onClose,
  onModeChange,
  onSave,
  onDelete,
  onPrint,
  onLog,
}: {
  open: boolean;
  mode: DrawerMode;
  notice: GuestNotice | null;
  authorLabel: string;
  onClose: () => void;
  onModeChange: (mode: DrawerMode) => void;
  onSave: (input: GuestNoticeInput, id?: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onPrint: (notice: GuestNotice, locale: GuestNoticeLocale) => void;
  onLog: (noticeId: string, action: 'viewed' | 'printed' | 'confirmed') => Promise<void>;
}) {
  const [form, setForm] = useState<GuestNoticeInput>(emptyInput(authorLabel));
  const [locale, setLocale] = useState<GuestNoticeLocale>('ko');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm } = useConfirmDialog();
  const { data: logs = [] } = useGuestNoticeLogs(mode === 'read' && notice ? notice.id : null);
  const viewedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      viewedRef.current = null;
      return;
    }
    if (notice && mode !== 'create') {
      setForm({
        title: notice.title,
        category: notice.category,
        status: notice.status,
        body_ko: notice.body_ko,
        body_en: notice.body_en,
        body_zh: notice.body_zh,
        body_ja: notice.body_ja,
        valid_from: notice.valid_from,
        valid_until: notice.valid_until,
        author: notice.author || authorLabel,
      });
    } else if (mode === 'create') {
      setForm(emptyInput(authorLabel));
    }
    setError(null);
    setLocale('ko');
  }, [open, notice, mode, authorLabel]);

  useEffect(() => {
    if (!open || mode !== 'read' || !notice) return;
    if (viewedRef.current === notice.id) return;
    viewedRef.current = notice.id;
    void onLog(notice.id, 'viewed');
  }, [open, mode, notice?.id, onLog]);

  if (!open) return null;

  const bodyKey = localeBodyKey(locale);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.body_ko.trim()) {
      setError('제목과 한국어 본문을 입력해 주세요.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, title: form.title.trim() }, notice?.id);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside
        className="drawer-panel drawer-panel--guest-notice"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="고객 안내문"
      >
        <div className="drawer-panel__form">
        <header className="drawer-panel__header modal__header">
          <div className="drawer-panel__heading">
            <p className="drawer-panel__mode">고객 안내</p>
            <h2 className="drawer-panel__title">{mode === 'create' ? '새 안내문' : notice?.title}</h2>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        </header>

        <div className="drawer-panel__body">
        {mode === 'read' && notice ? (
          <>
            <div className="guest-notice-drawer__meta">
              <span>{notice.category}</span>
              <span>{GUEST_NOTICE_STATUS_LABELS[notice.status]}</span>
              {notice.valid_from || notice.valid_until ? (
                <span>
                  {formatDateLabel(notice.valid_from)}
                  {notice.valid_until ? ` ~ ${formatDateLabel(notice.valid_until)}` : ''}
                </span>
              ) : null}
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
            <div className="guest-notice-drawer__preview">{noticeBodyForLocale(notice, locale)}</div>
            <div className="guest-notice-drawer__actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={async () => {
                  onPrint(notice, locale);
                  await onLog(notice.id, 'printed');
                }}
              >
                출력
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={async () => {
                  await onLog(notice.id, 'confirmed');
                }}
              >
                확인 기록
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => onModeChange('edit')}>
                수정
              </button>
            </div>
            {logs.length ? (
              <section className="guest-notice-drawer__logs">
                <h3>확인 · 출력 기록</h3>
                <ul>
                  {logs.map((log) => (
                    <li key={log.id}>
                      <strong>{GUEST_NOTICE_LOG_LABELS[log.action]}</strong>
                      {log.staff_name ? ` · ${log.staff_name}` : ''}
                      {log.work_group ? ` (${log.work_group}조)` : ''}
                      <span>{new Date(log.created_at).toLocaleString('ko-KR')}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        ) : (
          <form noValidate onSubmit={handleSubmit}>
            <div className="form-grid">
              <label className="field field--full">
                <span>제목 *</span>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </label>
              <label className="field">
                <span>분류</span>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as GuestNoticeInput['category'] })}
                >
                  {GUEST_NOTICE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>상태</span>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as GuestNoticeStatus })}
                >
                  {Object.entries(GUEST_NOTICE_STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>게시 시작</span>
                <input
                  type="date"
                  value={form.valid_from ?? ''}
                  onChange={(e) => setForm({ ...form, valid_from: e.target.value || null })}
                />
              </label>
              <label className="field">
                <span>게시 종료</span>
                <input
                  type="date"
                  value={form.valid_until ?? ''}
                  onChange={(e) => setForm({ ...form, valid_until: e.target.value || null })}
                />
              </label>
              <div className="field field--full">
                <span>본문 (다국어)</span>
                <div className="guest-notice-drawer__locales" role="radiogroup" aria-label="편집 언어">
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
                <textarea
                  rows={12}
                  value={form[bodyKey]}
                  onChange={(e) => setForm({ ...form, [bodyKey]: e.target.value })}
                  placeholder="고객에게 전달할 안내문 전체를 작성하세요. 공사·시설·이용 안내 등."
                />
              </div>
            </div>
            {error ? <p className="amenity-alert">{error}</p> : null}
            <div className="modal__footer">
              {notice ? (
                <button
                  type="button"
                  className="btn btn--danger"
                  onClick={async () => {
                    const ok = await confirm({
                      title: '안내문 삭제',
                      message: `「${notice.title}」을(를) 삭제합니다.`,
                      tone: 'danger',
                      confirmLabel: '삭제',
                    });
                    if (!ok) return;
                    await onDelete(notice.id);
                    onClose();
                  }}
                >
                  삭제
                </button>
              ) : (
                <span />
              )}
              <div className="modal__footer-right">
                <button type="button" className="btn btn--ghost" onClick={onClose}>
                  취소
                </button>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  저장
                </button>
              </div>
            </div>
          </form>
        )}
        </div>
        </div>
      </aside>
    </div>
  );
}

export function GuestNoticesPageClient() {
  const { requireSession, authorLabel, session } = useWorkSession();
  const { notices, isLoading, error, saveNotice, deleteNotice, logAction } = useGuestNotices();
  const [statusFilter, setStatusFilter] = useState<'all' | GuestNoticeStatus>('published');
  const [categoryFilter, setCategoryFilter] = useState<'all' | (typeof GUEST_NOTICE_CATEGORIES)[number]>('all');
  const [query, setQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('read');
  const [activeNotice, setActiveNotice] = useState<GuestNotice | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notices.filter((notice) => {
      if (statusFilter !== 'all' && notice.status !== statusFilter) return false;
      if (categoryFilter !== 'all' && notice.category !== categoryFilter) return false;
      if (!q) return true;
      return [notice.title, notice.body_ko, notice.body_en, notice.category].join(' ').toLowerCase().includes(q);
    });
  }, [notices, statusFilter, categoryFilter, query]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }

  function openRead(notice: GuestNotice) {
    setActiveNotice(notice);
    setDrawerMode('read');
    setDrawerOpen(true);
  }

  function openCreate() {
    if (!requireSession('안내문 작성')) return;
    setActiveNotice(null);
    setDrawerMode('create');
    setDrawerOpen(true);
  }

  async function handleLog(noticeId: string, action: 'viewed' | 'printed' | 'confirmed') {
    if (!session.name) return;
    try {
      await logAction.mutateAsync({
        noticeId,
        action,
        staffName: session.name,
        workGroup: session.group,
      });
      if (action === 'confirmed') showToast('확인 기록을 남겼습니다.');
    } catch {
      /* non-blocking */
    }
  }

  return (
    <>
      <section className="guest-notices-page">
        <div className="guest-notices-page__header">
          <div>
            <h2>고객 안내</h2>
            <p>고객 안내문·공사 공지를 작성하고, 출력·확인 기록을 남깁니다.</p>
          </div>
          <button type="button" className="btn btn--primary" onClick={openCreate}>
            + 안내문 작성
          </button>
        </div>

        <div className="guest-notices-toolbar">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제목·내용 검색…"
            aria-label="안내문 검색"
          />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="all">전체 상태</option>
            {Object.entries(GUEST_NOTICE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}>
            <option value="all">전체 분류</option>
            {GUEST_NOTICE_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <p className="empty-state">불러오는 중…</p>
        ) : error ? (
          <p className="empty-state" style={{ color: '#b91c1c' }}>
            안내문을 불러오지 못했습니다. Supabase에 040_guest_notices_review_account.sql 마이그레이션을 적용했는지 확인해 주세요.
          </p>
        ) : !visible.length ? (
          <p className="empty-state">표시할 안내문이 없습니다.</p>
        ) : (
          <div className="guest-notices-grid">
            {visible.map((notice) => (
              <article
                key={notice.id}
                className={`guest-notice-card guest-notice-card--${notice.status}`}
                onClick={() => openRead(notice)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') openRead(notice);
                }}
              >
                <div className="guest-notice-card__top">
                  <span className="guest-notice-card__category">{notice.category}</span>
                  <span className="guest-notice-card__status">{GUEST_NOTICE_STATUS_LABELS[notice.status]}</span>
                </div>
                <h3>{notice.title}</h3>
                <p>{notice.body_ko.split('\n')[0]}</p>
                {notice.valid_from || notice.valid_until ? (
                  <span className="guest-notice-card__dates">
                    {formatDateLabel(notice.valid_from)}
                    {notice.valid_until ? ` ~ ${formatDateLabel(notice.valid_until)}` : ''}
                  </span>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <GuestNoticeDrawer
        open={drawerOpen}
        mode={drawerMode}
        notice={activeNotice}
        authorLabel={authorLabel}
        onClose={() => setDrawerOpen(false)}
        onModeChange={setDrawerMode}
        onSave={async (input, id) => {
          await saveNotice.mutateAsync({ id, input });
          showToast(id ? '안내문이 수정되었습니다.' : '안내문이 저장되었습니다.');
        }}
        onDelete={async (id) => {
          await deleteNotice.mutateAsync(id);
          showToast('안내문이 삭제되었습니다.');
        }}
        onPrint={(notice, locale) => printGuestNotice(notice, locale)}
        onLog={handleLog}
      />

      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
