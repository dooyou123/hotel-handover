'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getNavPageMeta } from '@/lib/nav/page-meta';
import {
  currentMonthKey,
  downloadScheduleImage,
  extractScheduleMentions,
  formatMonthLabel,
  getPinnedScheduleMonth,
  isValidMonthKey,
  printScheduleImage,
  shiftMonthKey,
  type ScheduleBoardVersion,
} from '@/lib/schedules/api';
import { useScheduleBoardImage } from '@/lib/schedules/use-schedule-board';
import { usePinnedScheduleMonth } from '@/lib/schedules/use-schedule-alerts';
import { useIsManager } from '@/lib/handover/use-cards';
import { useWorkSession } from '@/lib/handover/use-work-session';
import { useConfirmDialog } from '@/components/ui/confirm-dialog';
import { closeOnOverlayClick } from '@/lib/ui/close-on-overlay-click';

function formatAbsoluteTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** x분 전 / x시간 전 / x일 전. 마우스오버용 절대시각은 formatAbsoluteTime. */
function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return '방금';

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return '방금';
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}일 전`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월 전`;

  const years = Math.floor(days / 365);
  return `${Math.max(years, 1)}년 전`;
}

function uploaderText(version: Pick<ScheduleBoardVersion, 'created_by_label'>): string {
  return version.created_by_label?.trim() || '작성자 미상';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** 메모 안의 `@직원이름`을 하이라이트해서 렌더링합니다. */
function renderNoteWithMentions(note: string, staffNames: string[]) {
  const mentions = extractScheduleMentions(note, staffNames);
  if (!mentions.length) return note;
  const pattern = new RegExp(`(${mentions.map((n) => `@${escapeRegExp(n)}`).join('|')})`, 'g');
  return note.split(pattern).map((part, index) =>
    part.startsWith('@') && mentions.includes(part.slice(1)) ? (
      <mark key={index} className="sched-mention">
        {part}
      </mark>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

function fileFromClipboard(event: ClipboardEvent): File | null {
  const items = event.clipboardData?.items;
  if (!items?.length) return null;
  for (const item of Array.from(items)) {
    if (!item.type.startsWith('image/')) continue;
    const blob = item.getAsFile();
    if (!blob) continue;
    const ext = item.type.split('/')[1] || 'png';
    const name =
      blob.name && blob.name !== 'image.png'
        ? blob.name
        : `clipboard-${Date.now()}.${ext === 'jpeg' ? 'jpg' : ext}`;
    return new File([blob], name, { type: item.type });
  }
  return null;
}

export function SchedulesPage() {
  const pageMeta = getNavPageMeta('/schedules');
  const searchParams = useSearchParams();
  const { pinnedMonth, pinMonth } = usePinnedScheduleMonth();
  const [monthKey, setMonthKey] = useState(currentMonthKey);
  const monthBootstrapped = useRef(false);
  const {
    image,
    isLoading,
    versions,
    reads,
    months,
    staffNames,
    upload,
    clear,
    deleteVersion,
    markRead,
  } = useScheduleBoardImage(monthKey);
  const { confirm } = useConfirmDialog();
  const { session, authorLabel, requireSession } = useWorkSession();
  const { data: isManager = false } = useIsManager();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareZoom, setCompareZoom] = useState(1);
  const [compareLayout, setCompareLayout] = useState<'side' | 'stack'>('side');
  const [note, setNote] = useState('');
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [compareLeftId, setCompareLeftId] = useState<string | null>(null);
  const [compareRightId, setCompareRightId] = useState<string | null>(null);
  const compareScrollLeftRef = useRef<HTMLDivElement>(null);
  const compareScrollRightRef = useRef<HTMLDivElement>(null);
  const compareScrollLock = useRef(false);
  const [publishOpen, setPublishOpen] = useState(false);
  // 붙여넣거나 선택한 사진 — 바로 올리지 않고 변경 메모를 쓸 수 있는 확인 모달을 거친다
  const [pendingUpload, setPendingUpload] = useState<{
    file: File;
    source: 'file' | 'paste';
  } | null>(null);
  const [sideTab, setSideTab] = useState<'confirm' | 'versions'>('confirm');
  const monthInputRef = useRef<HTMLInputElement>(null);
  const busy = upload.isPending || clear.isPending || deleteVersion.isPending;
  const monthLabel = formatMonthLabel(monthKey);
  const isPinned = pinnedMonth === monthKey;

  const latestVersion = versions[0] ?? null;
  const previousVersion = versions[1] ?? null;
  const selectedVersion = versions.find((v) => v.id === selectedVersionId) ?? latestVersion;
  const compareLeft =
    versions.find((v) => v.id === compareLeftId) ?? previousVersion ?? selectedVersion;
  const compareRight = versions.find((v) => v.id === compareRightId) ?? latestVersion;

  useEffect(() => {
    const fromQuery = searchParams.get('month');
    if (fromQuery && isValidMonthKey(fromQuery)) {
      setMonthKey(fromQuery.trim());
      monthBootstrapped.current = true;
      return;
    }
    if (monthBootstrapped.current) return;
    monthBootstrapped.current = true;
    const pinned = getPinnedScheduleMonth();
    if (pinned) setMonthKey(pinned);
  }, [searchParams]);

  useEffect(() => {
    setSelectedVersionId(latestVersion?.id ?? null);
  }, [latestVersion?.id]);

  const latestReads = useMemo(
    () => (latestVersion ? reads.filter((r) => r.version_id === latestVersion.id) : []),
    [reads, latestVersion],
  );
  const readCountByVersion = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of reads) map.set(r.version_id, (map.get(r.version_id) ?? 0) + 1);
    return map;
  }, [reads]);

  const confirmedNames = useMemo(
    () => new Set(latestReads.map((r) => r.staff_name)),
    [latestReads],
  );
  const latestMentions = useMemo(
    () => new Set(extractScheduleMentions(latestVersion?.note ?? '', staffNames)),
    [latestVersion?.note, staffNames],
  );
  const pendingStaff = useMemo(
    () =>
      staffNames
        .filter((name) => !confirmedNames.has(name))
        .sort((a, b) => Number(latestMentions.has(b)) - Number(latestMentions.has(a))),
    [staffNames, confirmedNames, latestMentions],
  );
  const meConfirmed = Boolean(session.name && confirmedNames.has(session.name));
  const meMentioned = Boolean(session.name && latestMentions.has(session.name));

  function toggleMention(staffName: string) {
    const token = `@${staffName}`;
    setNote((prev) => {
      if (prev.includes(token)) {
        return prev
          .replace(`${token} `, '')
          .replace(token, '')
          .replace(/\s{2,}/g, ' ')
          .trimStart();
      }
      const sep = prev && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '';
      return `${prev}${sep}${token} `;
    });
  }

  async function uploadFile(file: File, source: 'file' | 'paste'): Promise<boolean> {
    setError(null);
    setMessage(null);
    try {
      await upload.mutateAsync({ file, note, uploaderLabel: authorLabel });
      setNote('');
      setPublishOpen(false);
      setMessage(
        source === 'paste'
          ? `${monthLabel} 스케줄 새 버전을 붙여넣기로 올렸습니다.`
          : `${monthLabel} 스케줄 새 버전을 올렸습니다.`,
      );
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '업로드에 실패했습니다.');
      return false;
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function onFilePicked(file: File | null) {
    if (!file) return;
    // 바로 올리지 않는다 — 미리보기 + 변경 메모 확인 모달을 띄운다
    setPendingUpload({ file, source: 'file' });
    // 모달에서 취소해도 같은 파일을 다시 고를 수 있게 입력값을 비워둔다
    if (inputRef.current) inputRef.current.value = '';
  }

  async function onClear() {
    if (!isManager) {
      setError('매니저만 스케줄을 삭제할 수 있습니다.');
      return;
    }
    const ok = await confirm({
      title: '스케줄 전체 삭제',
      message: `${monthLabel} 스케줄의 모든 버전과 확인 기록을 삭제할까요?`,
      confirmLabel: '삭제',
      tone: 'danger',
    });
    if (!ok) return;
    setError(null);
    setMessage(null);
    try {
      await clear.mutateAsync();
      setPublishOpen(false);
      setMessage(`${monthLabel} 스케줄을 삭제했습니다.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '삭제에 실패했습니다.');
    }
  }

  async function onDeleteVersion(version: ScheduleBoardVersion) {
    if (!isManager) {
      setError('매니저만 스케줄 사진을 삭제할 수 있습니다.');
      return;
    }
    const ok = await confirm({
      title: '버전 삭제',
      message: `${monthLabel} 스케줄 v${version.version} 사진을 삭제할까요?\n확인 기록도 함께 지워지며 되돌릴 수 없습니다.`,
      confirmLabel: '삭제',
      tone: 'danger',
    });
    if (!ok) return;
    setError(null);
    setMessage(null);
    try {
      await deleteVersion.mutateAsync(version.id);
      if (selectedVersionId === version.id) setSelectedVersionId(null);
      setMessage(`${monthLabel} 스케줄 v${version.version}을 삭제했습니다.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '삭제에 실패했습니다.');
    }
  }

  async function onConfirmRead() {
    if (!latestVersion) return;
    if (!requireSession('스케줄 확인')) return;
    setError(null);
    try {
      await markRead.mutateAsync({
        versionId: latestVersion.id,
        staffName: session.name,
        shift: session.group,
      });
      setMessage(`${authorLabel} 확인 완료로 기록했습니다.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '확인 처리에 실패했습니다.');
    }
  }

  async function onDownload() {
    if (!selectedVersion) return;
    setError(null);
    try {
      await downloadScheduleImage(
        selectedVersion.url,
        `${monthKey}-v${selectedVersion.version}-${selectedVersion.filename || 'schedule.png'}`,
      );
      setMessage('이미지를 저장했습니다.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '다운로드에 실패했습니다.');
    }
  }

  function onPrint() {
    if (!selectedVersion) return;
    setError(null);
    try {
      printScheduleImage(selectedVersion.url, {
        title: `${monthLabel} 스케줄`,
        version: selectedVersion.version,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '인쇄 창을 열지 못했습니다.');
    }
  }

  function openCompare(againstId?: string) {
    setCompareLeftId(againstId ?? previousVersion?.id ?? selectedVersion?.id ?? null);
    setCompareRightId(latestVersion?.id ?? null);
    setCompareZoom(1.25);
    setCompareLayout('side');
    setCompareOpen(true);
  }

  function syncCompareScroll(source: 'left' | 'right') {
    if (compareScrollLock.current) return;
    const from =
      source === 'left' ? compareScrollLeftRef.current : compareScrollRightRef.current;
    const to =
      source === 'left' ? compareScrollRightRef.current : compareScrollLeftRef.current;
    if (!from || !to) return;
    compareScrollLock.current = true;
    to.scrollTop = from.scrollTop;
    to.scrollLeft = from.scrollLeft;
    requestAnimationFrame(() => {
      compareScrollLock.current = false;
    });
  }

  function selectMonth(next: string) {
    setMessage(null);
    setError(null);
    setCompareOpen(false);
    setMonthKey(next);
  }

  useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, [contenteditable="true"]')) return;
      if (upload.isPending || clear.isPending) return;
      const file = fileFromClipboard(event);
      if (!file) return;
      event.preventDefault();
      // 바로 올리지 않는다 — 미리보기 + 변경 메모 확인 모달을 띄운다
      setPendingUpload({ file, source: 'paste' });
    }
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });

  const pendingPreviewUrl = useMemo(
    () => (pendingUpload ? URL.createObjectURL(pendingUpload.file) : null),
    [pendingUpload],
  );
  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

  useEffect(() => {
    if (!pendingUpload) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setPendingUpload(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pendingUpload]);

  async function confirmPendingUpload() {
    if (!pendingUpload) return;
    const ok = await uploadFile(pendingUpload.file, pendingUpload.source);
    // 실패하면 모달을 유지해 메모를 잃지 않고 다시 시도할 수 있게 한다
    if (ok) setPendingUpload(null);
  }

  useEffect(() => {
    if (!fullscreen && !compareOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setFullscreen(false);
        setCompareOpen(false);
      }
    }
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [fullscreen, compareOpen]);

  useEffect(() => {
    if (!image && !isLoading) setPublishOpen(true);
  }, [image, isLoading]);

  const viewingLatest = !selectedVersion || !latestVersion || selectedVersion.id === latestVersion.id;

  return (
    <section className="schedules-page">
      <header className="schedules-page__header">
        <div className="schedules-page__header-main">
          <h1>{pageMeta.label}</h1>
          <p className="schedules-page__lead">
            {image?.updated_at ? (
              <>
                {monthLabel} · v{image.current_version} ·{' '}
                {uploaderText({ created_by_label: image.updated_by_label })} ·{' '}
                <time dateTime={image.updated_at} title={formatAbsoluteTime(image.updated_at)}>
                  {formatRelativeTime(image.updated_at)}
                </time>
                {isPinned ? <span className="schedules-page__pin-badge">고정</span> : null}
              </>
            ) : (
              `${monthLabel} 스케줄 사진을 올려 주세요.`
            )}
          </p>
        </div>
        <button
          type="button"
          className={`btn btn--small${publishOpen ? ' btn--outline' : ' btn--primary'}`}
          onClick={() => setPublishOpen((v) => !v)}
        >
          {publishOpen ? '올리기 닫기' : '새 버전 올리기'}
        </button>
      </header>

      <div className="schedules-page__month-nav">
        <div className="schedules-page__month-bar">
          <button
            type="button"
            className="btn btn--ghost btn--small"
            aria-label="이전 달"
            onClick={() => selectMonth(shiftMonthKey(monthKey, -1))}
          >
            ←
          </button>
          <div className="schedules-page__month-current" aria-live="polite">
            <strong>{formatMonthLabel(monthKey)}</strong>
            <span>보는 중</span>
          </div>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            aria-label="다음 달"
            onClick={() => selectMonth(shiftMonthKey(monthKey, 1))}
          >
            →
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            aria-label="월 선택"
            title="월 선택"
            onClick={() => monthInputRef.current?.showPicker?.() ?? monthInputRef.current?.click()}
          >
            월
          </button>
          <input
            ref={monthInputRef}
            type="month"
            className="schedules-page__month-hidden"
            value={monthKey}
            onChange={(e) => {
              const next = e.target.value;
              if (next) selectMonth(next);
            }}
          />
          <button
            type="button"
            className="btn btn--outline btn--small"
            onClick={() => selectMonth(currentMonthKey())}
          >
            이번 달
          </button>
          <button
            type="button"
            className={`btn btn--small${isPinned ? ' btn--primary' : ' btn--outline'}`}
            onClick={() => {
              if (isPinned) {
                pinMonth(null);
                setMessage('월 고정을 해제했습니다.');
              } else {
                pinMonth(monthKey);
                setMessage(
                  `${monthLabel}을 고정했습니다. 다음에 스케줄 메뉴를 열면 이 달이 먼저 보입니다.`,
                );
              }
            }}
          >
            {isPinned ? '고정 해제' : '고정'}
          </button>
        </div>

        {months.length ? (
          <div className="schedules-page__month-chips" role="list" aria-label="등록된 월">
            {months.map((key) => {
              const match = /^(\d{4})-(\d{2})$/.exec(key);
              const year = match?.[1] ?? '';
              const month = match ? String(Number(match[2])) : key;
              return (
                <button
                  key={key}
                  type="button"
                  role="listitem"
                  aria-pressed={key === monthKey}
                  className={`schedules-page__month-chip${key === monthKey ? ' is-active' : ''}${
                    pinnedMonth === key ? ' is-pinned' : ''
                  }`}
                  onClick={() => selectMonth(key)}
                >
                  <span className="schedules-page__month-chip-year">{year}</span>
                  <span className="schedules-page__month-chip-month">{month}월</span>
                  {pinnedMonth === key ? (
                    <span className="schedules-page__month-chip-pin">고정</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {publishOpen ? (
        <section className="schedules-page__publish">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)}
          />
          <div className="schedules-page__publish-head">
            <h2>새 버전 올리기</h2>
            <p>변경 메모와 @호명을 남긴 뒤 사진을 올리면, 호명된 직원에게 확인 알림이 갑니다.</p>
          </div>
          <div className="schedules-page__note-field">
            <label>
              <span>변경 메모 (선택)</span>
              <textarea
                value={note}
                placeholder={
                  '예) 야간 근무 조정했습니다.\n@홍길동 8/14 근무로 변경되었으니 꼭 확인해 주세요.'
                }
                rows={3}
                maxLength={1000}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            {staffNames.length ? (
              <div className="schedules-page__mention-row" aria-label="직원 호명">
                <span>호명</span>
                {staffNames.map((staffName) => {
                  const on = note.includes(`@${staffName}`);
                  return (
                    <button
                      key={staffName}
                      type="button"
                      className={`schedules-page__mention-chip${on ? ' is-on' : ''}`}
                      onClick={() => toggleMention(staffName)}
                    >
                      @{staffName}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          <div className="schedules-page__publish-actions">
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {busy && upload.isPending
                ? '올리는 중…'
                : image
                  ? '사진 선택 · 새 버전 올리기'
                  : '사진 선택 · 올리기'}
            </button>
            {isManager && image ? (
              <button
                type="button"
                className="schedules-page__danger-link"
                disabled={busy}
                onClick={() => void onClear()}
              >
                이 달 스케줄 전체 삭제
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* 붙여넣기용 숨은 파일 입력 (카드 접혀 있어도) */}
      {!publishOpen ? (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)}
        />
      ) : null}

      {message ? <p className="schedules-page__status">{message}</p> : null}
      {error ? <p className="schedules-page__status schedules-page__status--error">{error}</p> : null}

      <div className="schedules-page__body">
        <div className="schedules-page__stage">
          {isLoading ? (
            <p className="schedules-page__empty">불러오는 중…</p>
          ) : selectedVersion ? (
            <div className="schedules-page__hero">
              <div className="schedules-page__overlay" role="toolbar" aria-label="보기 도구">
                <button type="button" onClick={() => setFullscreen(true)}>
                  전체 화면
                </button>
                <button type="button" onClick={() => void onDownload()}>
                  다운로드
                </button>
                <button type="button" onClick={onPrint}>
                  인쇄
                </button>
                {versions.length >= 2 ? (
                  <button type="button" onClick={() => openCompare()}>
                    버전 비교
                  </button>
                ) : null}
                {!viewingLatest && latestVersion ? (
                  <>
                    <span className="schedules-page__overlay-sep" />
                    <span className="schedules-page__viewing-chip">
                      v{selectedVersion.version} 보는 중
                    </span>
                    <button type="button" onClick={() => openCompare(selectedVersion.id)}>
                      최신과 비교
                    </button>
                    <button type="button" onClick={() => setSelectedVersionId(latestVersion.id)}>
                      최신으로
                    </button>
                  </>
                ) : null}
              </div>
              <button
                type="button"
                className="schedules-page__figure-btn"
                onClick={() => setFullscreen(true)}
                aria-label="전체 화면으로 보기"
              >
                <figure className="schedules-page__figure">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedVersion.url}
                    alt={`${monthLabel} 스케줄 v${selectedVersion.version}`}
                    className="schedules-page__image"
                  />
                </figure>
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="schedules-page__empty schedules-page__empty--cta"
              disabled={busy}
              onClick={() => {
                setPublishOpen(true);
                inputRef.current?.click();
              }}
            >
              <strong>{monthLabel} 스케줄 사진을 올려 주세요</strong>
              <span>새 버전 올리기를 열거나 Ctrl+V / ⌘V 로 붙여넣기 할 수 있습니다.</span>
            </button>
          )}
        </div>

        <aside className="schedules-page__side">
          <div className="schedules-page__side-tabs" role="tablist" aria-label="스케줄 정보">
            <button
              type="button"
              role="tab"
              aria-selected={sideTab === 'confirm'}
              className={sideTab === 'confirm' ? 'is-active' : undefined}
              onClick={() => setSideTab('confirm')}
            >
              확인
              {latestVersion ? (
                <em>
                  {latestReads.length}/{staffNames.length || latestReads.length}
                </em>
              ) : null}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sideTab === 'versions'}
              className={sideTab === 'versions' ? 'is-active' : undefined}
              onClick={() => setSideTab('versions')}
            >
              버전
              {versions.length ? <em>{versions.length}</em> : null}
            </button>
          </div>

          {sideTab === 'confirm' ? (
            latestVersion ? (
              <section
                className={`sched-read sched-read--side${meMentioned && !meConfirmed ? ' is-attention' : ''}`}
              >
                <div className="sched-read__head">
                  <h2>
                    확인 현황 <span className="sched-read__ver">v{latestVersion.version}</span>
                  </h2>
                </div>

                {latestVersion.note ? (
                  <p className="sched-read__note">
                    {renderNoteWithMentions(latestVersion.note, staffNames)}
                  </p>
                ) : null}

                <div className="sched-read__me">
                  {meConfirmed ? (
                    <span className="sched-read__done">
                      ✓ {authorLabel || session.name} 확인 완료
                    </span>
                  ) : (
                    <>
                      <span className="sched-read__me-label">
                        {meMentioned
                          ? `${authorLabel || session.name || '본인'} 님, 호명된 스케줄입니다.`
                          : authorLabel
                            ? `${authorLabel} 님, 확인하셨나요?`
                            : '이 스케줄을 확인하셨나요?'}
                      </span>
                      <button
                        type="button"
                        className="btn btn--primary btn--small"
                        disabled={markRead.isPending}
                        onClick={() => void onConfirmRead()}
                      >
                        {markRead.isPending ? '기록 중…' : '확인했어요'}
                      </button>
                    </>
                  )}
                </div>

                {pendingStaff.length ? (
                  <div className="sched-read__group sched-read__group--pending">
                    <span className="sched-read__group-label">
                      아직 확인 안 함 · {pendingStaff.length}명
                    </span>
                    <div className="sched-read__chips">
                      {pendingStaff.map((name) => {
                        const mentioned = latestMentions.has(name);
                        return (
                          <span
                            key={name}
                            className={`sched-read__chip is-pending${mentioned ? ' is-mentioned' : ''}`}
                          >
                            {mentioned ? <i className="sched-read__tag">호명</i> : null}
                            {name}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : staffNames.length ? (
                  <p className="sched-read__all">전원 확인 완료</p>
                ) : (
                  <p className="schedules-page__side-empty">직원 명단이 없습니다.</p>
                )}

                {latestReads.length ? (
                  <div className="sched-read__group">
                    <span className="sched-read__group-label">확인함 · {latestReads.length}명</span>
                    <div className="sched-read__chips">
                      {latestReads.map((r) => (
                        <span
                          key={r.staff_name}
                          className="sched-read__chip is-done"
                          title={`${formatRelativeTime(r.read_at)} 확인 (${formatAbsoluteTime(r.read_at)})`}
                        >
                          {r.shift ? `${r.shift} · ` : ''}
                          {r.staff_name}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            ) : (
              <p className="schedules-page__side-empty">스케줄이 올라오면 확인 현황이 표시됩니다.</p>
            )
          ) : versions.length ? (
            <section className="sched-versions sched-versions--side">
              <div className="sched-versions__head">
                <h2>버전 기록</h2>
                {versions.length >= 2 ? (
                  <button
                    type="button"
                    className="btn btn--outline btn--small"
                    onClick={() => openCompare()}
                  >
                    비교
                  </button>
                ) : null}
              </div>
              <ol className="sched-versions__list">
                {versions.map((v) => {
                  const active = selectedVersion?.id === v.id;
                  const isLatest = latestVersion?.id === v.id;
                  return (
                    <li
                      key={v.id}
                      className={`sched-versions__item${active ? ' is-active' : ''}`}
                    >
                      <button
                        type="button"
                        className="sched-versions__thumb"
                        onClick={() => setSelectedVersionId(v.id)}
                        aria-label={`v${v.version} 보기`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.url} alt={`v${v.version}`} />
                      </button>
                      <div className="sched-versions__meta">
                        <div className="sched-versions__title">
                          <strong>v{v.version}</strong>
                          {isLatest ? <span className="sched-versions__badge">현재</span> : null}
                          <span className="sched-versions__reads">
                            {readCountByVersion.get(v.id) ?? 0}명
                          </span>
                        </div>
                        <div className="sched-versions__by">
                          {uploaderText(v)} ·{' '}
                          <time dateTime={v.created_at} title={formatAbsoluteTime(v.created_at)}>
                            {formatRelativeTime(v.created_at)}
                          </time>
                        </div>
                        {v.note ? (
                          <p className="sched-versions__note">
                            {renderNoteWithMentions(v.note, staffNames)}
                          </p>
                        ) : null}
                      </div>
                      <div className="sched-versions__actions">
                        {!isLatest && latestVersion ? (
                          <button
                            type="button"
                            className="btn btn--ghost btn--small"
                            onClick={() => openCompare(v.id)}
                          >
                            비교
                          </button>
                        ) : null}
                        {isManager ? (
                          <button
                            type="button"
                            className="btn btn--ghost btn--small sched-versions__delete"
                            disabled={busy}
                            onClick={() => void onDeleteVersion(v)}
                          >
                            삭제
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : (
            <p className="schedules-page__side-empty">아직 버전이 없습니다.</p>
          )}
        </aside>
      </div>

      {fullscreen && selectedVersion ? (
        <div
          className="schedules-page__fs"
          role="dialog"
          aria-modal="true"
          aria-label={`${monthLabel} 스케줄 전체 화면`}
          onClick={() => setFullscreen(false)}
        >
          <div className="schedules-page__fs-bar" onClick={(e) => e.stopPropagation()}>
            <div>
              <strong>
                {monthLabel} · v{selectedVersion.version}
              </strong>
              <span>
                {uploaderText(selectedVersion)} ·{' '}
                <time
                  dateTime={selectedVersion.created_at}
                  title={formatAbsoluteTime(selectedVersion.created_at)}
                >
                  {formatRelativeTime(selectedVersion.created_at)}
                </time>
              </span>
            </div>
            <div className="schedules-page__fs-actions">
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => void onDownload()}
              >
                다운로드
              </button>
              <button type="button" className="btn btn--ghost btn--small" onClick={onPrint}>
                인쇄
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => setFullscreen(false)}
              >
                닫기 · Esc
              </button>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedVersion.url}
            alt={`${monthLabel} 스케줄 v${selectedVersion.version}`}
            className="schedules-page__fs-image"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}

      {compareOpen && compareLeft && compareRight ? (
        <div
          className="sched-compare"
          role="dialog"
          aria-modal="true"
          aria-label="스케줄 버전 비교"
        >
          <div className="sched-compare__bar">
            <div className="sched-compare__title">
              <strong>{monthLabel} 버전 비교</strong>
              <span>같은 위치를 스크롤하면 양쪽이 함께 움직입니다. 확대해서 칸 단위로 보세요.</span>
            </div>
            <div className="sched-compare__controls">
              <div className="sched-compare__seg" role="group" aria-label="배치">
                <button
                  type="button"
                  className={compareLayout === 'side' ? 'is-active' : undefined}
                  onClick={() => setCompareLayout('side')}
                >
                  좌우
                </button>
                <button
                  type="button"
                  className={compareLayout === 'stack' ? 'is-active' : undefined}
                  onClick={() => setCompareLayout('stack')}
                >
                  위아래
                </button>
              </div>
              <div className="sched-compare__seg" role="group" aria-label="확대">
                {[1, 1.25, 1.5, 2].map((z) => (
                  <button
                    key={z}
                    type="button"
                    className={compareZoom === z ? 'is-active' : undefined}
                    onClick={() => setCompareZoom(z)}
                  >
                    {Math.round(z * 100)}%
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={() => setCompareOpen(false)}
              >
                닫기 · Esc
              </button>
            </div>
          </div>

          <div className={`sched-compare__grid is-${compareLayout}`}>
            <div className="sched-compare__col">
              <div className="sched-compare__meta">
                <label>
                  <span>이전 / 비교 대상</span>
                  <select
                    value={compareLeft.id}
                    onChange={(e) => setCompareLeftId(e.target.value)}
                  >
                    {versions.map((v) => (
                      <option key={v.id} value={v.id}>
                        v{v.version} · {uploaderText(v)} · {formatRelativeTime(v.created_at)}
                      </option>
                    ))}
                  </select>
                </label>
                {compareLeft.note ? (
                  <p className="sched-compare__note">
                    {renderNoteWithMentions(compareLeft.note, staffNames)}
                  </p>
                ) : (
                  <p className="sched-compare__note is-empty">메모 없음</p>
                )}
              </div>
              <div
                ref={compareScrollLeftRef}
                className="sched-compare__viewport"
                onScroll={() => syncCompareScroll('left')}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={compareLeft.url}
                  alt={`v${compareLeft.version}`}
                  style={{ width: `${compareZoom * 100}%` }}
                />
              </div>
            </div>

            <div className="sched-compare__col">
              <div className="sched-compare__meta">
                <label>
                  <span>최신 / 비교 대상</span>
                  <select
                    value={compareRight.id}
                    onChange={(e) => setCompareRightId(e.target.value)}
                  >
                    {versions.map((v) => (
                      <option key={v.id} value={v.id}>
                        v{v.version} · {uploaderText(v)} · {formatRelativeTime(v.created_at)}
                      </option>
                    ))}
                  </select>
                </label>
                {compareRight.note ? (
                  <p className="sched-compare__note">
                    {renderNoteWithMentions(compareRight.note, staffNames)}
                  </p>
                ) : (
                  <p className="sched-compare__note is-empty">메모 없음</p>
                )}
              </div>
              <div
                ref={compareScrollRightRef}
                className="sched-compare__viewport"
                onScroll={() => syncCompareScroll('right')}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={compareRight.url}
                  alt={`v${compareRight.version}`}
                  style={{ width: `${compareZoom * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {pendingUpload && pendingPreviewUrl ? (
        <div className="modal-overlay" onClick={closeOnOverlayClick(() => setPendingUpload(null))}>
          <div
            className="modal schedules-paste-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedules-paste-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="schedules-paste-modal__head">
              <h2 id="schedules-paste-title">
                {pendingUpload.source === 'paste'
                  ? '붙여넣은 사진으로 새 버전 올리기'
                  : '선택한 사진으로 새 버전 올리기'}
              </h2>
              <p>
                {monthLabel} 스케줄의 새 버전으로 올라갑니다. 올리기 전에 변경 메모와 @호명을
                남길 수 있습니다.
              </p>
            </div>

            <div className="schedules-paste-modal__preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pendingPreviewUrl} alt="올릴 스케줄 사진 미리보기" />
            </div>

            <div className="schedules-page__note-field">
              <label>
                <span>변경 메모 (선택)</span>
                <textarea
                  value={note}
                  placeholder={
                    '예) 야간 근무 조정했습니다.\n@홍길동 8/14 근무로 변경되었으니 꼭 확인해 주세요.'
                  }
                  rows={3}
                  maxLength={1000}
                  autoFocus
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
              {staffNames.length ? (
                <div className="schedules-page__mention-row" aria-label="직원 호명">
                  <span>호명</span>
                  {staffNames.map((staffName) => {
                    const on = note.includes(`@${staffName}`);
                    return (
                      <button
                        key={staffName}
                        type="button"
                        className={`schedules-page__mention-chip${on ? ' is-on' : ''}`}
                        onClick={() => toggleMention(staffName)}
                      >
                        @{staffName}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="schedules-paste-modal__actions">
              <button
                type="button"
                className="btn btn--outline"
                disabled={upload.isPending}
                onClick={() => setPendingUpload(null)}
              >
                취소
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={upload.isPending}
                onClick={() => void confirmPendingUpload()}
              >
                {upload.isPending ? '올리는 중…' : '새 버전 올리기'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
