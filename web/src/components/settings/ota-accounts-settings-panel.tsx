'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  fetchOtaAccountsSheetSettings,
  saveOtaAccountsSheetSettings,
} from '@/lib/ota-accounts/settings';
import { isValidGoogleSheetShareUrl } from '@/lib/ota-accounts/sheet-url';
import { DEFAULT_OTA_ACCOUNT_COLUMNS } from '@/lib/ota-accounts/types';

type OtaAccountsSettingsPanelProps = {
  onSaved: (message: string) => void;
};

export function OtaAccountsSettingsPanel({ onSaved }: OtaAccountsSettingsPanelProps) {
  const [sheetUrl, setSheetUrl] = useState('');
  const [colSite, setColSite] = useState(DEFAULT_OTA_ACCOUNT_COLUMNS.site);
  const [colLogin, setColLogin] = useState(DEFAULT_OTA_ACCOUNT_COLUMNS.login);
  const [colPassword, setColPassword] = useState(DEFAULT_OTA_ACCOUNT_COLUMNS.password);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchOtaAccountsSheetSettings()
      .then((settings) => {
        setSheetUrl(settings.sheetUrl);
        setColSite(settings.columns.site);
        setColLogin(settings.columns.login);
        setColPassword(settings.columns.password);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    const trimmedUrl = sheetUrl.trim();
    if (trimmedUrl && !isValidGoogleSheetShareUrl(trimmedUrl)) {
      onSaved('구글 시트 공유 링크 형식이 올바르지 않습니다.');
      return;
    }

    setSaving(true);
    try {
      const saved = await saveOtaAccountsSheetSettings({
        sheetUrl: trimmedUrl,
        columns: {
          site: colSite.trim() || DEFAULT_OTA_ACCOUNT_COLUMNS.site,
          login: colLogin.trim() || DEFAULT_OTA_ACCOUNT_COLUMNS.login,
          password: colPassword.trim() || DEFAULT_OTA_ACCOUNT_COLUMNS.password,
          extra: DEFAULT_OTA_ACCOUNT_COLUMNS.extra,
          url: DEFAULT_OTA_ACCOUNT_COLUMNS.url,
        },
      });
      setSheetUrl(saved.sheetUrl);
      setColSite(saved.columns.site);
      setColLogin(saved.columns.login);
      setColPassword(saved.columns.password);
      onSaved('OTA 계정 시트 설정을 저장했습니다.');
    } catch (caught) {
      onSaved(caught instanceof Error ? caught.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="empty-state">불러오는 중…</p>;

  return (
    <article className="schedule-panel">
      <div className="schedule-panel__header">
        <div>
          <h3>OTA 계정 시트</h3>
          <p>구글 시트 공유 링크와 컬럼 헤더 이름을 설정합니다.</p>
        </div>
        <Link href="/ota-accounts" className="btn btn--ghost btn--small">
          OTA 계정 보기
        </Link>
      </div>
      <div className="form-grid" style={{ padding: '0 1rem 1rem' }}>
        <label className="field field--full">
          <span>구글 시트 공유 링크</span>
          <input
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            placeholder="https://docs.google.com/spreadsheets/d/.../edit?usp=sharing"
            spellCheck={false}
          />
          <small style={{ color: 'var(--text-muted)' }}>
            Google Sheets API 없이 공유 링크만 사용합니다. 시트가 「링크가 있는 모든 사용자 · 뷰어」로
            공유되어 있어야 합니다.
          </small>
        </label>

        <div className="ota-accounts-settings__columns">
          <label className="field">
            <span>여행사명 컬럼</span>
            <input
              value={colSite}
              onChange={(e) => setColSite(e.target.value)}
              placeholder="여행사명"
              spellCheck={false}
            />
          </label>
          <label className="field">
            <span>ID 컬럼</span>
            <input
              value={colLogin}
              onChange={(e) => setColLogin(e.target.value)}
              placeholder="ID"
              spellCheck={false}
            />
          </label>
          <label className="field">
            <span>PW 컬럼</span>
            <input
              value={colPassword}
              onChange={(e) => setColPassword(e.target.value)}
              placeholder="PW"
              spellCheck={false}
            />
          </label>
        </div>
        <small style={{ color: 'var(--text-muted)' }}>
          시트 첫 행에 적힌 헤더 이름과 동일하게 입력해 주세요. 대소문자·띄어쓰기는 구분하지 않습니다.
        </small>

        <button type="button" className="btn btn--primary" disabled={saving} onClick={() => void handleSave()}>
          {saving ? '저장 중…' : '저장'}
        </button>
      </div>
    </article>
  );
}
