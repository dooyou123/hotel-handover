'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useDismissibleOverlay } from '@/components/ui/use-dismissible-overlay';
import { FEEDBACK_CATEGORIES } from '@/lib/constants';
import { submitFeedback, type FeedbackCategory } from '@/lib/feedback/api';
import { useWorkSession } from '@/lib/handover/use-work-session';

type FeedbackModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function FeedbackModal({ open, onClose, onSuccess }: FeedbackModalProps) {
  const pathname = usePathname();
  const { session } = useWorkSession();
  const { overlayProps, panelProps } = useDismissibleOverlay(onClose);
  const [category, setCategory] = useState<FeedbackCategory>('feature');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCategory('feature');
    setSubject('');
    setBody('');
    setError(null);
  }, [open]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!subject.trim() || !body.trim()) {
      setError('제목과 내용을 입력해 주세요.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await submitFeedback({
        category,
        subject,
        body,
        pagePath: pathname,
        reporterShift: session.shift,
        reporterGroup: session.group,
        reporterName: session.name,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '전송에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" {...overlayProps}>
      <div className="modal modal--feedback" {...panelProps}>
        <form noValidate onSubmit={handleSubmit} className="modal__form">
          <div className="modal__header">
            <div>
              <h2>기능 개선 · 버그 신고</h2>
              <p className="shift-modal__sub">관리자에게 전달됩니다. 현재 화면 경로가 함께 기록됩니다.</p>
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          </div>

          <div className="feedback-form">
            <label className="field field--full">
              <span>구분</span>
              <select value={category} onChange={(e) => setCategory(e.target.value as FeedbackCategory)}>
                {FEEDBACK_CATEGORIES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field field--full">
              <span>제목</span>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="예: 체크리스트 항목이 안 보여요"
                maxLength={120}
              />
            </label>
            <label className="field field--full">
              <span>내용</span>
              <textarea
                rows={5}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="어떤 문제인지, 어떻게 개선되면 좋을지 적어 주세요."
              />
            </label>
            <p className="feedback-form__meta">
              페이지: {pathname || '/'}
              {session.shift && session.group && session.name
                ? ` · ${session.shift} · ${session.group}조 · ${session.name}`
                : ''}
            </p>
          </div>

          {error ? <p className="amenity-alert">{error}</p> : null}

          <div className="modal__footer">
            <div className="modal__footer-right">
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                취소
              </button>
              <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? '전송 중…' : '관리자에게 보내기'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

type FeedbackButtonProps = {
  className?: string;
  label?: string;
  onOpen?: () => void;
};

export function FeedbackButton({
  className = 'btn btn--ghost btn--small',
  label = '개선 · 버그 신고',
  onOpen,
}: FeedbackButtonProps = {}) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          onOpen?.();
          setOpen(true);
        }}
      >
        {label}
      </button>
      <FeedbackModal
        open={open}
        onClose={() => setOpen(false)}
        onSuccess={() => showToast('관리자에게 전달되었습니다. 감사합니다!')}
      />
      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
