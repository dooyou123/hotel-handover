'use client';

import { useEffect, useRef, useState } from 'react';
import { useDismissibleOverlay } from '@/components/ui/use-dismissible-overlay';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { GuestNoticePhraseSortableList } from '@/components/guest-notices/guest-notice-phrase-sortable-list';
import {
  GUEST_NOTICE_LOCALE_LABELS,
  type GuestNoticeBrandingInput,
  type GuestNoticeLocale,
  type GuestNoticePhrase,
  type GuestNoticePhraseInput,
} from '@/lib/guest-notices/types';
import { useGuestNoticeBranding } from '@/lib/guest-notices/use-guest-notice-branding';
import type { UseMutationResult } from '@tanstack/react-query';

type GuestNoticeSettingsDrawerProps = {
  open: boolean;
  onClose: () => void;
  onToast?: (message: string) => void;
  phrases: GuestNoticePhrase[];
  savePhrase: UseMutationResult<
    GuestNoticePhrase,
    Error,
    { id?: string; input: GuestNoticePhraseInput }
  >;
  deletePhrase: UseMutationResult<void, Error, string>;
  reorderPhrases: UseMutationResult<void, Error, string[]>;
};

const emptyPhrase = (): GuestNoticePhraseInput => ({
  title: '',
  body_ko: '',
  body_en: '',
  body_zh: '',
  body_ja: '',
});

function localeBodyKey(locale: GuestNoticeLocale): 'body_ko' | 'body_en' | 'body_zh' | 'body_ja' {
  if (locale === 'en') return 'body_en';
  if (locale === 'zh') return 'body_zh';
  if (locale === 'ja') return 'body_ja';
  return 'body_ko';
}

function PhraseEditor({
  phrase,
  onSave,
  onCancel,
  onDelete,
}: {
  phrase: GuestNoticePhrase | null;
  onSave: (input: GuestNoticePhraseInput, id?: string) => Promise<void>;
  onCancel: () => void;
  onDelete?: (id: string) => Promise<void>;
}) {
  const [form, setForm] = useState<GuestNoticePhraseInput>(emptyPhrase());
  const [locale, setLocale] = useState<GuestNoticeLocale>('ko');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm } = useConfirmDialog();

  useEffect(() => {
    if (phrase) {
      setForm({
        title: phrase.title,
        body_ko: phrase.body_ko,
        body_en: phrase.body_en,
        body_zh: phrase.body_zh,
        body_ja: phrase.body_ja,
        sort_order: phrase.sort_order,
      });
    } else {
      setForm(emptyPhrase());
    }
    setLocale('ko');
    setError(null);
  }, [phrase]);

  const bodyKey = localeBodyKey(locale);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.body_ko.trim()) {
      setError('제목과 한국어 문구를 입력해 주세요.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ ...form, title: form.title.trim() }, phrase?.id);
      onCancel();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="guest-notice-settings__phrase-form" noValidate onSubmit={handleSubmit}>
      <label className="field field--full">
        <span>상용구 제목 *</span>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </label>
      <div className="field field--full">
        <span>문구 (다국어)</span>
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
          rows={5}
          value={form[bodyKey]}
          onChange={(e) => setForm({ ...form, [bodyKey]: e.target.value })}
          placeholder="안내문에 삽입할 상용 문구"
        />
      </div>
      {error ? <p className="amenity-alert">{error}</p> : null}
      <div className="guest-notice-settings__phrase-actions">
        {phrase && onDelete ? (
          <button
            type="button"
            className="btn btn--danger btn--small"
            onClick={async () => {
              const ok = await confirm({
                title: '상용구 삭제',
                message: `「${phrase.title}」을(를) 삭제합니다.`,
                tone: 'danger',
                confirmLabel: '삭제',
              });
              if (!ok) return;
              await onDelete(phrase.id);
              onCancel();
            }}
          >
            삭제
          </button>
        ) : (
          <span />
        )}
        <div className="modal__footer-right">
          <button type="button" className="btn btn--ghost btn--small" onClick={onCancel}>
            취소
          </button>
          <button type="submit" className="btn btn--primary btn--small" disabled={saving}>
            저장
          </button>
        </div>
      </div>
    </form>
  );
}

export function GuestNoticeSettingsDrawer({
  open,
  onClose,
  onToast,
  phrases,
  savePhrase,
  deletePhrase,
  reorderPhrases,
}: GuestNoticeSettingsDrawerProps) {
  const { overlayProps, panelProps } = useDismissibleOverlay(onClose);
  const fileRef = useRef<HTMLInputElement>(null);
  const { branding, isLoading, saveFooter, uploadLogo, removeLogo } = useGuestNoticeBranding();
  const [footerForm, setFooterForm] = useState<GuestNoticeBrandingInput>({
    footer_ko: '',
    footer_en: '',
    footer_zh: '',
    footer_ja: '',
  });
  const [footerLocale, setFooterLocale] = useState<GuestNoticeLocale>('ko');
  const [footerSaving, setFooterSaving] = useState(false);
  const [editingPhrase, setEditingPhrase] = useState<GuestNoticePhrase | null | 'new'>(null);

  useEffect(() => {
    if (!open || !branding) return;
    setFooterForm({
      footer_ko: branding.footer_ko,
      footer_en: branding.footer_en,
      footer_zh: branding.footer_zh,
      footer_ja: branding.footer_ja,
    });
    setEditingPhrase(null);
    setFooterLocale('ko');
  }, [open, branding]);

  if (!open) return null;

  const footerKey =
    footerLocale === 'en'
      ? 'footer_en'
      : footerLocale === 'zh'
        ? 'footer_zh'
        : footerLocale === 'ja'
          ? 'footer_ja'
          : 'footer_ko';

  async function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await uploadLogo.mutateAsync(file);
      onToast?.('로고가 업로드되었습니다.');
    } catch (caught) {
      onToast?.(caught instanceof Error ? caught.message : '로고 업로드에 실패했습니다.');
    }
    event.target.value = '';
  }

  return (
    <div className="drawer-overlay" {...overlayProps}>
      <aside
        className="drawer-panel drawer-panel--guest-notice guest-notice-settings"
        {...panelProps}
        role="dialog"
        aria-modal="true"
        aria-label="고객 안내 설정"
      >
        <div className="drawer-panel__form">
          <header className="drawer-panel__header modal__header">
            <div className="drawer-panel__heading">
              <p className="drawer-panel__mode">고객 안내 설정</p>
              <h2 className="drawer-panel__title">로고 · 하단 문구 · 상용구</h2>
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </header>

          <div className="drawer-panel__body guest-notice-settings__body">
            {isLoading ? (
              <p className="empty-state">불러오는 중…</p>
            ) : (
              <>
                <section className="guest-notice-settings__section">
                  <h3>호텔 로고</h3>
                  <p className="guest-notice-settings__hint">
                    안내문 하단에 표시됩니다. PNG·JPG·WEBP·SVG, 1MB 이하.
                  </p>
                  <div className="guest-notice-settings__logo-row">
                    {branding?.logo_url ? (
                      <img className="guest-notice-settings__logo-preview" src={branding.logo_url} alt="호텔 로고" />
                    ) : (
                      <div className="guest-notice-settings__logo-placeholder">로고 없음</div>
                    )}
                    <div className="guest-notice-settings__logo-actions">
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        className="guest-notice-settings__file-input"
                        onChange={handleLogoChange}
                      />
                      <button
                        type="button"
                        className="btn btn--ghost btn--small"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploadLogo.isPending}
                      >
                        {branding?.logo_url ? '로고 변경' : '로고 업로드'}
                      </button>
                      {branding?.logo_url ? (
                        <button
                          type="button"
                          className="btn btn--ghost btn--small"
                          onClick={async () => {
                            await removeLogo.mutateAsync();
                            onToast?.('로고를 삭제했습니다.');
                          }}
                          disabled={removeLogo.isPending}
                        >
                          삭제
                        </button>
                      ) : null}
                    </div>
                  </div>
                </section>

                <section className="guest-notice-settings__section">
                  <h3>하단 문구</h3>
                  <p className="guest-notice-settings__hint">
                    모든 안내문·인쇄물 하단에 자동으로 붙습니다. (연락처·호텔명 등)
                  </p>
                  <div className="guest-notice-drawer__locales" role="radiogroup" aria-label="하단 문구 언어">
                    {(Object.keys(GUEST_NOTICE_LOCALE_LABELS) as GuestNoticeLocale[]).map((code) => (
                      <button
                        key={code}
                        type="button"
                        role="radio"
                        aria-checked={footerLocale === code}
                        className={`guest-notice-drawer__locale${footerLocale === code ? ' is-active' : ''}`}
                        onClick={() => setFooterLocale(code)}
                      >
                        {GUEST_NOTICE_LOCALE_LABELS[code]}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={4}
                    value={footerForm[footerKey]}
                    onChange={(e) => setFooterForm({ ...footerForm, [footerKey]: e.target.value })}
                    placeholder="예) ○○호텔 프런트 데스크 · TEL 02-000-0000"
                  />
                  <button
                    type="button"
                    className="btn btn--primary btn--small"
                    disabled={footerSaving}
                    onClick={async () => {
                      setFooterSaving(true);
                      try {
                        await saveFooter.mutateAsync(footerForm);
                        onToast?.('하단 문구를 저장했습니다.');
                      } catch (caught) {
                        onToast?.(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
                      } finally {
                        setFooterSaving(false);
                      }
                    }}
                  >
                    하단 문구 저장
                  </button>
                </section>

                <section className="guest-notice-settings__section">
                  <div className="guest-notice-settings__section-head">
                    <h3>상용구</h3>
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={() => setEditingPhrase('new')}
                      disabled={editingPhrase !== null}
                    >
                      + 추가
                    </button>
                  </div>
                  <p className="guest-notice-settings__hint">
                    안내문 작성 시 본문에 삽입할 자주 쓰는 문구입니다. ⠿ 핸들을 드래그해 순서를 바꿉니다.
                  </p>

                  {editingPhrase ? (
                    <PhraseEditor
                      phrase={editingPhrase === 'new' ? null : editingPhrase}
                      onSave={async (input, id) => {
                        await savePhrase.mutateAsync({ id, input });
                        onToast?.(id ? '상용구를 수정했습니다.' : '상용구를 추가했습니다.');
                      }}
                      onCancel={() => setEditingPhrase(null)}
                      onDelete={async (id) => {
                        await deletePhrase.mutateAsync(id);
                        onToast?.('상용구를 삭제했습니다.');
                      }}
                    />
                  ) : (
                    <GuestNoticePhraseSortableList
                      phrases={phrases}
                      disabled={reorderPhrases.isPending || editingPhrase !== null}
                      onReorder={(orderedIds) => {
                        void reorderPhrases.mutateAsync(orderedIds);
                      }}
                      onEdit={(phrase) => setEditingPhrase(phrase)}
                    />
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
