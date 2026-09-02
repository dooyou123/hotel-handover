'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getNavPageMeta } from '@/lib/nav/page-meta';
import { otaAccountKey } from '@/lib/ota-accounts/account-key';
import { refreshOtaAccounts, useOtaAccounts } from '@/lib/ota-accounts/use-ota-accounts';
import { useOtaAccountMemos } from '@/lib/ota-accounts/use-ota-account-memos';
import { useWorkSession } from '@/lib/handover/use-work-session';
import type { OtaAccount } from '@/lib/ota-accounts/types';

function formatFetchedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

async function copyText(value: string, onCopied: (message: string) => void, label: string) {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    onCopied(`${label}을(를) 복사했습니다.`);
  } catch {
    onCopied('복사에 실패했습니다.');
  }
}

function OtaAccountMemoField({
  account,
  value,
  saving,
  onSave,
}: {
  account: OtaAccount;
  value: string;
  saving: boolean;
  onSave: (memo: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value);
  const lastSavedRef = useRef(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(value);
    lastSavedRef.current = value;
  }, [value, account.id]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight + 2}px`;
  }, [draft, value]);

  async function commit() {
    const next = draft.trim();
    if (next === lastSavedRef.current.trim()) return;
    await onSave(next);
    lastSavedRef.current = next;
  }

  return (
    <div className="ota-accounts-list__memo-field">
      <textarea
        ref={textareaRef}
        className="ota-accounts-list__memo"
        value={draft}
        rows={1}
        placeholder="메모"
        aria-label={`${account.site || 'OTA'} 메모`}
        disabled={saving}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
      />
    </div>
  );
}

function OtaAccountsList({
  accounts,
  memos = {},
  savingKey,
  onCopied,
  onSaveMemo,
}: {
  accounts: OtaAccount[];
  memos: Record<string, string>;
  savingKey: string | null;
  onCopied: (message: string) => void;
  onSaveMemo: (account: OtaAccount, memo: string) => Promise<void>;
}) {
  return (
    <div className="ota-accounts-list-panel">
      <div className="ota-accounts-list__head" aria-hidden="true">
        <span>OTA</span>
        <span>아이디</span>
        <span>비밀번호</span>
        <span>메모</span>
        <span>복사</span>
      </div>
      <ul className="ota-accounts-list">
        {accounts.map((account) => {
          const key = otaAccountKey(account);
          return (
            <li key={account.id} className="ota-accounts-list__row">
            <div className="ota-accounts-list__main">
              <span className="ota-accounts-list__site">{account.site || '—'}</span>
              <button
                type="button"
                className="ota-accounts-list__value"
                onClick={() => void copyText(account.loginId, onCopied, '아이디')}
                title="클릭하여 복사"
              >
                {account.loginId || '없음'}
              </button>
              <button
                type="button"
                className="ota-accounts-list__value"
                onClick={() => void copyText(account.password, onCopied, '비밀번호')}
                title="클릭하여 복사"
              >
                {account.password || '없음'}
              </button>
              <OtaAccountMemoField
                account={account}
                value={memos[key] ?? ''}
                saving={savingKey === key}
                onSave={(memo) => onSaveMemo(account, memo)}
              />
              <div className="ota-accounts-list__actions">
                <button
                  type="button"
                  className="btn btn--ghost btn--xs"
                  disabled={!account.loginId}
                  onClick={() => void copyText(account.loginId, onCopied, '아이디')}
                >
                  ID
                </button>
                <button
                  type="button"
                  className="btn btn--ghost btn--xs"
                  disabled={!account.password}
                  onClick={() => void copyText(account.password, onCopied, '비밀번호')}
                >
                  PW
                </button>
              </div>
            </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function OtaAccountsPageClient() {
  const meta = getNavPageMeta('/ota-accounts');
  const { data, error, isLoading, isFetching, refetch } = useOtaAccounts();
  const { listQuery: memosQuery, saveMemo } = useOtaAccountMemos();
  const { authorLabel, requireSession } = useWorkSession();
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const memosByKey = useMemo(() => {
    const map: Record<string, string> = {};
    for (const [key, row] of Object.entries(memosQuery.data ?? {})) {
      map[key] = row.memo;
    }
    return map;
  }, [memosQuery.data]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showLoading = mounted && isLoading;
  const showFetching = mounted && isFetching;

  const filtered = useMemo(() => {
    const accounts = data?.accounts ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((account) => {
      const key = otaAccountKey(account);
      const memo = memosByKey[key] ?? '';
      return [account.site, account.loginId, account.password, memo].join(' ').toLowerCase().includes(q);
    });
  }, [data?.accounts, query, memosByKey]);

  const sheetUrl = data?.sheetUrl?.trim() ?? '';

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2200);
  }

  async function handleSaveMemo(account: OtaAccount, memo: string) {
    if (!requireSession('OTA 메모 저장')) return;
    const key = otaAccountKey(account);
    setSavingKey(key);
    try {
      await saveMemo.mutateAsync({
        accountKey: key,
        memo,
        updatedBy: authorLabel,
      });
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : '메모 저장에 실패했습니다.');
    } finally {
      setSavingKey(null);
    }
  }

  async function handleRefresh() {
    try {
      await refreshOtaAccounts();
      await refetch();
      showToast('시트에서 최신 데이터를 불러왔습니다.');
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : '새로고침에 실패했습니다.');
    }
  }

  return (
    <div className="page-shell ota-accounts-page">
      <header className="page-shell__header">
        <div>
          <h1>{meta.label}</h1>
          <p className="page-shell__desc">{meta.description}</p>
        </div>
        <div className="ota-accounts-page__toolbar">
          {sheetUrl ? (
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--outline btn--small"
            >
              구글 시트 열기
            </a>
          ) : null}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="OTA 이름·아이디 검색…"
            aria-label="OTA 계정 검색"
            className="ota-accounts-page__search"
          />
          <button
            type="button"
            className="btn btn--outline btn--small"
            disabled={showFetching}
            onClick={() => void handleRefresh()}
          >
            {showFetching ? '불러오는 중…' : '새로고침'}
          </button>
        </div>
      </header>

      <p className="ota-accounts-page__notice">
        이 구글 시트는 <strong>예약실 직원만</strong> 수정할 수 있습니다. 아이디·비밀번호가 맞지 않으면{' '}
        <strong>예약실</strong>로 문의해 주세요.
      </p>

      {data ? (
        <p className="ota-accounts-page__meta">
          총 {data.accounts.length}개
          {filtered.length !== data.accounts.length ? ` · ${filtered.length}개 표시` : ''}
          {data.fetchedAt ? ` · ${formatFetchedAt(data.fetchedAt)} 기준` : ''}
          {data.columns
            ? ` · 컬럼 ${data.columns.site}/${data.columns.login}/${data.columns.password}`
            : ''}
        </p>
      ) : null}

      {showLoading ? <p className="ota-accounts-page__status">구글 시트에서 OTA 계정을 불러오는 중…</p> : null}

      {error ? (
        <div className="ota-accounts-page__error">
          <p>{error instanceof Error ? error.message : 'OTA 계정을 불러오지 못했습니다.'}</p>
          <p>
            <Link href="/settings">설정 → 메뉴</Link>에서 구글 시트 공유 링크를 등록할 수 있습니다.
          </p>
        </div>
      ) : null}

      {!showLoading && !error && filtered.length ? (
        <OtaAccountsList
          accounts={filtered}
          memos={memosByKey}
          savingKey={savingKey}
          onCopied={showToast}
          onSaveMemo={handleSaveMemo}
        />
      ) : null}

      {!showLoading && !error && data && !filtered.length ? (
        <p className="ota-accounts-page__status">검색 결과가 없습니다.</p>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}
