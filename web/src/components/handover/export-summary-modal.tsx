'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ACTION_LABELS } from '@/lib/handover/activity';
import { formatTime } from '@/lib/handover/card-utils';
import {
  buildPrintDocumentHtml,
  buildSummaryText,
  downloadTextFile,
  getExportFilename,
  getSummaryMetaLine,
  hasSummaryContent,
  openSummaryPrintWindow,
} from '@/lib/handover/daily-summary';
import {
  buildShiftSummaryData,
  cardStatusLabel,
  formatActivityDetail,
} from '@/lib/handover/shift-summary';
import { fetchTodayActivityLogs } from '@/lib/handover/use-activity-logs';
import type { ActivityLog, Card, Notice } from '@/lib/handover/types';

type ExportSummaryModalProps = {
  open: boolean;
  cards: Card[];
  notices: Notice[];
  authorLabel: string;
  onClose: () => void;
  onToast: (message: string) => void;
};

function PreviewSection({
  title,
  subtitle,
  items,
  warn,
  renderItem,
}: {
  title: string;
  subtitle?: string;
  items: unknown[];
  warn?: boolean;
  renderItem: (item: unknown, index: number) => React.ReactNode;
}) {
  if (!items.length) return null;
  return (
    <section className={`shift-section${warn ? ' shift-section--warn' : ''}`}>
      <div className="shift-section__header">
        <h3>
          {title} ({items.length}건)
        </h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      <div className="shift-section__list">{items.map(renderItem)}</div>
    </section>
  );
}

function CardPreviewItem({ card, warn }: { card: Card; warn?: boolean }) {
  return (
    <div className={`shift-item${warn ? ' shift-item--warn' : ''}`}>
      <div className="shift-item__top">
        <span className="shift-item__status">{cardStatusLabel(card)}</span>
        {card.room ? <span className="shift-item__room">{card.room}</span> : null}
      </div>
      <p className="shift-item__title">{card.title}</p>
      {card.next_action ? <p className="shift-item__action">다음: {card.next_action}</p> : null}
      <p className="shift-item__meta">
        {card.author || '작성자 미입력'} · {formatTime(card.updated_at || card.created_at)}
      </p>
    </div>
  );
}

function NoticePreviewItem({ notice }: { notice: Notice }) {
  return (
    <div className="shift-item">
      <p className="shift-item__title">{notice.content}</p>
      <p className="shift-item__meta">
        {notice.author || '작성자 미입력'} · {formatTime(notice.updated_at || notice.created_at)}
      </p>
    </div>
  );
}

function ActivityPreviewItem({ log }: { log: ActivityLog }) {
  const actor = log.shift && log.staff_name ? `${log.shift} · ${log.staff_name}` : '작성자 미입력';
  const detail = formatActivityDetail(log);
  return (
    <div className="shift-item">
      <div className="shift-item__top">
        <span className="shift-item__status">{ACTION_LABELS[log.action] || log.action}</span>
        <span className="shift-item__meta">{formatTime(log.created_at)}</span>
      </div>
      <p className="shift-item__title">{log.summary}</p>
      <p className="shift-item__meta">
        {actor}
        {detail ? ` · ${detail}` : ''}
      </p>
    </div>
  );
}

export function ExportSummaryModal({
  open,
  cards,
  notices,
  authorLabel,
  onClose,
  onToast,
}: ExportSummaryModalProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [exportingImage, setExportingImage] = useState(false);
  const [todayLogs, setTodayLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const data = useMemo(() => buildShiftSummaryData(cards, notices), [cards, notices]);
  const metaLine = getSummaryMetaLine(authorLabel);
  const hasContent = hasSummaryContent(data, todayLogs);

  useEffect(() => {
    if (!open) return;
    setLogsLoading(true);
    fetchTodayActivityLogs(200)
      .then(setTodayLogs)
      .catch(() => setTodayLogs([]))
      .finally(() => setLogsLoading(false));
  }, [open, cards, notices]);

  if (!open) return null;

  function handleExportText() {
    downloadTextFile(buildSummaryText(data, todayLogs, authorLabel), getExportFilename('txt'));
    onToast('텍스트 파일을 저장했습니다.');
  }

  function handleExportPrint() {
    const ok = openSummaryPrintWindow(data, todayLogs, authorLabel);
    if (!ok) onToast('팝업이 차단되었습니다. 팝업 허용 후 다시 시도해 주세요.');
  }

  async function handleExportImage() {
    if (!sheetRef.current) return;
    setExportingImage(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      sheetRef.current.innerHTML = buildPrintDocumentHtml(data, todayLogs, authorLabel);
      sheetRef.current.classList.remove('hidden');
      const canvas = await html2canvas(sheetRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = getExportFilename('png');
      link.href = canvas.toDataURL('image/png');
      link.click();
      onToast('이미지 파일을 저장했습니다.');
    } catch {
      onToast('이미지 저장에 실패했습니다.');
    } finally {
      sheetRef.current?.classList.add('hidden');
      if (sheetRef.current) sheetRef.current.innerHTML = '';
      setExportingImage(false);
    }
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal--export" onClick={(event) => event.stopPropagation()}>
          <div className="export-modal">
            <div className="modal__header">
              <div>
                <h2>일일 요약 내보내기</h2>
                <p className="shift-modal__sub">{metaLine}</p>
              </div>
              <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
                ✕
              </button>
            </div>

            <div className="export-modal__stats">
              {data.unackedUrgent.length > 0 ? (
                <span className="shift-stat shift-stat--warn">
                  ⚠️ 미확인 긴급 <strong>{data.unackedUrgent.length}</strong>
                </span>
              ) : null}
              <span className="shift-stat">
                🔴 긴급 <strong>{data.urgentActive.length}</strong>
              </span>
              <span className="shift-stat">
                🟡 진행중 <strong>{data.progressActive.length}</strong>
              </span>
              <span className="shift-stat">
                📋 오늘 <strong>{data.todayCards.length}</strong>
              </span>
              <span className="shift-stat">
                ✅ 완료 <strong>{data.doneToday.length}</strong>
              </span>
            </div>

            <div className="export-modal__preview">
              {logsLoading ? (
                <p className="shift-empty">변경 기록 불러오는 중…</p>
              ) : !hasContent ? (
                <p className="shift-empty">오늘 표시할 업무가 없습니다. 보드에서 새 인수인계를 추가해 주세요.</p>
              ) : (
                <>
                  <PreviewSection
                    title="⚠️ 미확인 긴급"
                    subtitle="교대 시작 후 카드에서 ✓ 긴급 확인을 눌러 주세요."
                    items={data.unackedUrgent}
                    warn
                    renderItem={(item) => <CardPreviewItem key={(item as Card).id} card={item as Card} warn />}
                  />
                  <PreviewSection
                    title="🔴 현재 긴급"
                    items={data.urgentActive}
                    renderItem={(item) => <CardPreviewItem key={(item as Card).id} card={item as Card} />}
                  />
                  <PreviewSection
                    title="🟡 현재 진행중"
                    items={data.progressActive}
                    renderItem={(item) => <CardPreviewItem key={(item as Card).id} card={item as Card} />}
                  />
                  <PreviewSection
                    title="📢 업무 공지"
                    items={data.announcements}
                    renderItem={(item) => <NoticePreviewItem key={(item as Notice).id} notice={item as Notice} />}
                  />
                  <PreviewSection
                    title="🔄 업무 변경"
                    items={data.changes}
                    renderItem={(item) => <NoticePreviewItem key={(item as Notice).id} notice={item as Notice} />}
                  />
                  <PreviewSection
                    title="✅ 오늘 완료"
                    items={data.doneToday}
                    renderItem={(item) => <CardPreviewItem key={(item as Card).id} card={item as Card} />}
                  />
                  <PreviewSection
                    title="📝 오늘 변경 기록"
                    items={todayLogs}
                    renderItem={(item) => (
                      <ActivityPreviewItem key={(item as ActivityLog).id} log={item as ActivityLog} />
                    )}
                  />
                </>
              )}
            </div>

            <div className="modal__footer export-modal__footer">
              <button type="button" onClick={onClose} className="btn btn--ghost">
                닫기
              </button>
              <div className="modal__footer-right export-modal__actions">
                <button type="button" onClick={handleExportText} className="btn btn--ghost">
                  텍스트 (.txt)
                </button>
                <button type="button" onClick={handleExportPrint} className="btn btn--ghost">
                  인쇄 / PDF
                </button>
                <button type="button" disabled={exportingImage} onClick={handleExportImage} className="btn btn--primary">
                  {exportingImage ? '저장 중…' : '이미지 (.png)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div ref={sheetRef} className="export-sheet hidden" aria-hidden />
    </>
  );
}
