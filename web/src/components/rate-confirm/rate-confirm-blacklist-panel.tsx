'use client';

import { useMemo, useState } from 'react';
import { tokenizeGuestName } from '@/lib/rate-confirm/blacklist-match';
import type { RateConfirmGuestBlacklistEntry } from '@/lib/rate-confirm/blacklist-types';
import { useRateConfirmBlacklist } from '@/lib/rate-confirm/use-rate-confirm-blacklist';
import { closeOnOverlayClick } from '@/lib/ui/close-on-overlay-click';

type RateConfirmBlacklistPanelProps = {
  authorLabel: string;
};

type FormState = {
  guest_name: string;
  reason: string;
  history_note: string;
  phone: string;
  email: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  guest_name: '',
  reason: '',
  history_note: '',
  phone: '',
  email: '',
  notes: '',
});

export function RateConfirmBlacklistPanel({ authorLabel }: RateConfirmBlacklistPanelProps) {
  const { listQuery, addEntry, updateEntry, deleteEntry } = useRateConfirmBlacklist();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const entries = listQuery.data ?? [];
  const activeCount = useMemo(() => entries.filter((entry) => entry.active).length, [entries]);
  const previewTokens = useMemo(
    () => (form.guest_name.trim() ? tokenizeGuestName(form.guest_name) : []),
    [form.guest_name],
  );

  function showMessage(text: string) {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 2600);
  }

  function resetForm() {
    setForm(emptyForm());
    setEditingId(null);
    setError(null);
  }

  function startEdit(entry: RateConfirmGuestBlacklistEntry) {
    setEditingId(entry.id);
    setForm({
      guest_name: entry.guest_name,
      reason: entry.reason,
      history_note: entry.history_note,
      phone: entry.phone,
      email: entry.email,
      notes: entry.notes,
    });
    setError(null);
  }

  async function submitForm() {
    setError(null);
    try {
      if (editingId) {
        await updateEntry.mutateAsync({
          id: editingId,
          input: form,
        });
        showMessage('블랙리스트를 수정했습니다.');
      } else {
        await addEntry.mutateAsync({
          ...form,
          created_by: authorLabel,
        });
        showMessage('블랙리스트에 등록했습니다.');
      }
      resetForm();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
    }
  }

  async function toggleActive(entry: RateConfirmGuestBlacklistEntry) {
    try {
      await updateEntry.mutateAsync({
        id: entry.id,
        input: { active: !entry.active },
      });
      showMessage(entry.active ? '비활성화했습니다.' : '다시 활성화했습니다.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '상태 변경에 실패했습니다.');
    }
  }

  async function removeEntry(entry: RateConfirmGuestBlacklistEntry) {
    if (!window.confirm(`「${entry.guest_name}」을(를) 블랙리스트에서 삭제할까요?`)) return;
    try {
      await deleteEntry.mutateAsync(entry.id);
      if (editingId === entry.id) resetForm();
      showMessage('삭제했습니다.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '삭제에 실패했습니다.');
    }
  }

  const busy = addEntry.isPending || updateEntry.isPending || deleteEntry.isPending;

  return (
    <div className="rc-blacklist">
      <header className="rc-blacklist__head">
        <div>
          <h3>고객 블랙리스트</h3>
          <p className="rc-muted">
            대조 시 파일의 고객명과 비교합니다. 이름 순서가 바뀌거나 미들네임이 있어도 같은 사람으로
            잡힙니다.
          </p>
        </div>
        <span className="rc-blacklist__count">활성 {activeCount}건</span>
      </header>

      <div className="rc-blacklist__layout">
        <section className="rc-blacklist__form-card">
          <h4>{editingId ? '항목 수정' : '새 등록'}</h4>
          <label className="field">
            <span>고객명 *</span>
            <input
              value={form.guest_name}
              onChange={(e) => setForm((prev) => ({ ...prev, guest_name: e.target.value }))}
              placeholder="예: AAA BBB"
              maxLength={120}
            />
          </label>
          {previewTokens.length ? (
            <p className="rc-blacklist__tokens">
              매칭 토큰: {previewTokens.map((token) => `[${token}]`).join(' ')}
            </p>
          ) : null}

          <label className="field">
            <span>등록 사유 *</span>
            <input
              value={form.reason}
              onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="예: 노쇼 반복, 객실 파솰"
              maxLength={200}
            />
          </label>

          <label className="field">
            <span>이전 투숙 기록</span>
            <textarea
              value={form.history_note}
              onChange={(e) => setForm((prev) => ({ ...prev, history_note: e.target.value }))}
              placeholder="예: 2025-08 객실 608 파솰 후 보상 미지급, 2025-11 노쇼 2회"
              rows={4}
            />
          </label>

          <div className="rc-blacklist__form-grid">
            <label className="field">
              <span>연락처 (선택)</span>
              <input
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="전화번호 일부"
                maxLength={40}
              />
            </label>
            <label className="field">
              <span>이메일 (선택)</span>
              <input
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="이메일 일부"
                maxLength={120}
              />
            </label>
          </div>

          <label className="field">
            <span>내부 메모 (선택)</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="직원만 보는 추가 메모"
              rows={2}
            />
          </label>

          {error ? <p className="rc-status rc-status--error">{error}</p> : null}
          {message ? <p className="rc-status rc-status--ok">{message}</p> : null}

          <div className="rc-blacklist__form-actions">
            <button type="button" className="btn btn--primary" disabled={busy} onClick={() => void submitForm()}>
              {editingId ? '수정 저장' : '등록'}
            </button>
            {editingId ? (
              <button type="button" className="btn btn--ghost" disabled={busy} onClick={resetForm}>
                취소
              </button>
            ) : null}
          </div>
        </section>

        <section className="rc-blacklist__list-card">
          <h4>등록 목록</h4>
          {listQuery.isLoading ? <p className="rc-muted">불러오는 중…</p> : null}
          {!listQuery.isLoading && !entries.length ? (
            <p className="rc-empty">등록된 블랙리스트가 없습니다.</p>
          ) : null}
          <ul className="rc-blacklist__list">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className={`rc-blacklist__item${entry.active ? '' : ' is-inactive'}${editingId === entry.id ? ' is-editing' : ''}`}
              >
                <div className="rc-blacklist__item-head">
                  <strong>{entry.guest_name}</strong>
                  <span className={`rc-blacklist__status${entry.active ? '' : ' is-off'}`}>
                    {entry.active ? '활성' : '비활성'}
                  </span>
                </div>
                <p className="rc-blacklist__reason">{entry.reason}</p>
                {entry.history_note ? (
                  <p className="rc-blacklist__history">{entry.history_note}</p>
                ) : null}
                <p className="rc-blacklist__meta">
                  {entry.created_by || '—'} · {new Date(entry.created_at).toLocaleDateString('ko-KR')}
                </p>
                <div className="rc-blacklist__item-actions">
                  <button type="button" className="btn btn--ghost btn--xs" onClick={() => startEdit(entry)}>
                    수정
                  </button>
                  <button type="button" className="btn btn--ghost btn--xs" onClick={() => void toggleActive(entry)}>
                    {entry.active ? '비활성' : '활성'}
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--xs rc-blacklist__delete"
                    onClick={() => void removeEntry(entry)}
                  >
                    삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

type RateConfirmBlacklistAlertModalProps = {
  hits: import('@/lib/rate-confirm/blacklist-match').BlacklistHit[];
  onClose: () => void;
};

export function RateConfirmBlacklistAlertModal({ hits, onClose }: RateConfirmBlacklistAlertModalProps) {
  if (!hits.length) return null;

  return (
    <div className="modal-overlay modal-overlay--records" onClick={closeOnOverlayClick(onClose)}>
      <div
        className="modal rc-blacklist-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rc-blacklist-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="rc-blacklist-modal__head">
          <span className="rc-blacklist-modal__icon" aria-hidden>
            ⚠
          </span>
          <div>
            <h2 id="rc-blacklist-modal-title">경고 · 블랙리스트 고객</h2>
            <p>대조 파일에서 블랙리스트에 등록된 고객 {hits.length}건이 발견되었습니다.</p>
          </div>
        </header>

        <div className="rc-blacklist-modal__body">
          {hits.map((hit) => (
            <article key={`${hit.record.ota}:${hit.entry.id}`} className="rc-blacklist-modal__hit">
              <div className="rc-blacklist-modal__hit-head">
                <strong>{hit.record.guestName}</strong>
                <span className="rc-blacklist-modal__ota">{hit.record.ota}</span>
              </div>
              <dl className="rc-blacklist-modal__meta">
                <div>
                  <dt>등록명</dt>
                  <dd>{hit.entry.guest_name}</dd>
                </div>
                <div>
                  <dt>등록 사유</dt>
                  <dd>{hit.entry.reason || '—'}</dd>
                </div>
              </dl>
              <div className="rc-blacklist-modal__history">
                <h3>이전 투숙 기록</h3>
                <p>{hit.entry.history_note.trim() || '기록 없음'}</p>
              </div>
              {hit.entry.phone || hit.entry.email ? (
                <p className="rc-blacklist-modal__contact">
                  {hit.entry.phone ? `연락처 ${hit.entry.phone}` : ''}
                  {hit.entry.phone && hit.entry.email ? ' · ' : ''}
                  {hit.entry.email ? `이메일 ${hit.entry.email}` : ''}
                </p>
              ) : null}
            </article>
          ))}
        </div>

        <footer className="rc-blacklist-modal__foot">
          <button type="button" className="btn btn--primary" onClick={onClose}>
            확인했습니다
          </button>
        </footer>
      </div>
    </div>
  );
}
