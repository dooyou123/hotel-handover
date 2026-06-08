'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type DialogTone = 'default' | 'warning' | 'danger';

export type ConfirmOptions = {
  title?: string;
  message: string;
  detail?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: DialogTone;
};

export type AlertOptions = {
  title?: string;
  message: string;
  detail?: string;
  okLabel?: string;
  tone?: DialogTone;
};

type DialogState =
  | ({ kind: 'confirm' } & ConfirmOptions)
  | ({ kind: 'alert' } & AlertOptions);

type ConfirmDialogContextValue = {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions | string) => Promise<void>;
};

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

const TONE_META: Record<DialogTone, { icon: string; defaultTitle: string }> = {
  default: { icon: 'ℹ️', defaultTitle: '안내' },
  warning: { icon: '⚠️', defaultTitle: '확인해 주세요' },
  danger: { icon: '🗑', defaultTitle: '삭제 확인' },
};

function resolveTone(state: DialogState): DialogTone {
  if (state.tone) return state.tone;
  if (state.kind === 'confirm' && state.confirmLabel === '삭제') return 'danger';
  return 'default';
}

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const titleId = useId();
  const descId = useId();

  const close = useCallback((result: boolean) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setDialog(null);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setDialog({ kind: 'confirm', ...options });
    });
  }, []);

  const alert = useCallback((options: AlertOptions | string) => {
    const normalized = typeof options === 'string' ? { message: options } : options;
    return new Promise<void>((resolve) => {
      resolveRef.current = () => resolve();
      setDialog({ kind: 'alert', ...normalized });
    });
  }, []);

  useEffect(() => {
    if (!dialog) return;
    const current = dialog;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        close(current.kind === 'confirm' ? false : true);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dialog, close]);

  const tone = dialog ? resolveTone(dialog) : 'default';
  const meta = TONE_META[tone];
  const title =
    dialog?.title ??
    (dialog?.kind === 'confirm' ? meta.defaultTitle : meta.defaultTitle);

  return (
    <ConfirmDialogContext.Provider value={{ confirm, alert }}>
      {children}
      {dialog ? (
        <div
          className="modal-overlay confirm-overlay"
          role="presentation"
          onClick={() => close(dialog.kind === 'confirm' ? false : true)}
        >
          <div
            className={`modal modal--confirm confirm-dialog confirm-dialog--${tone}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="confirm-dialog__body">
              <div className={`confirm-dialog__icon confirm-dialog__icon--${tone}`} aria-hidden>
                {meta.icon}
              </div>
              <div className="confirm-dialog__content">
                <h2 id={titleId} className="confirm-dialog__title">
                  {title}
                </h2>
                <p id={descId} className="confirm-dialog__message">
                  {dialog.message}
                </p>
                {dialog.detail ? <p className="confirm-dialog__detail">{dialog.detail}</p> : null}
              </div>
            </div>
            <div className="confirm-dialog__actions">
              {dialog.kind === 'confirm' ? (
                <>
                  <button
                    type="button"
                    className="btn btn--ghost confirm-dialog__cancel"
                    autoFocus
                    onClick={() => close(false)}
                  >
                    {dialog.cancelLabel ?? '취소'}
                  </button>
                  <button
                    type="button"
                    className={`btn confirm-dialog__confirm${tone === 'danger' ? ' btn--danger' : ' btn--primary'}`}
                    onClick={() => close(true)}
                  >
                    {dialog.confirmLabel ?? '확인'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className={`btn confirm-dialog__confirm${tone === 'danger' ? ' btn--danger' : ' btn--primary'}`}
                  autoFocus
                  onClick={() => close(true)}
                >
                  {dialog.okLabel ?? '확인'}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const ctx = useContext(ConfirmDialogContext);
  if (!ctx) {
    throw new Error('useConfirmDialog must be used within ConfirmDialogProvider');
  }
  return ctx;
}
