'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { logActivity } from '@/lib/handover/activity';
import { markNoticeRead, pinnedNotices as getPinnedNotices, unreadPinnedCount } from '@/lib/notices/reads';
import { useInvalidateNoticeReads, useNoticeReads } from '@/lib/notices/use-notice-reads';
import { formatTime } from '@/lib/handover/card-utils';
import { noticeListTitle, noticeTypeShort } from '@/lib/handover/notice-utils';
import { formatExpiryLabel } from '@/lib/handover/shift-summary';
import { useNotices } from '@/lib/handover/use-notices';
import { useIsManager } from '@/lib/handover/use-cards';
import { useWorkSession } from '@/lib/handover/use-work-session';
import {
  countNoticesForBoardTab,
  filterNoticesForBoard,
  NOTICE_BOARD_TABS,
  parseNoticeBoardTab,
  type NoticeBoardTab,
  type NoticeBoardView,
} from '@/lib/notices/filter';
import { isNoticeCompleted } from '@/lib/notices/status';
import type { Notice, NoticeInput, NoticeType } from '@/lib/handover/types';
import { NoticeDrawer, type NoticeDrawerMode } from './notice-drawer';

export function NoticesPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invalidateNoticeReads = useInvalidateNoticeReads();
  const { notices, isLoading, createNotice, updateNotice, deleteNotice, togglePin, toggleComplete } = useNotices();
  const { data: isManager = false } = useIsManager();
  const { session, requireSession, authorLabel } = useWorkSession();

  const channelParam = searchParams.get('channel');
  const initialTab = parseNoticeBoardTab(channelParam);

  const [boardTab, setBoardTab] = useState<NoticeBoardTab>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [boardView, setBoardView] = useState<NoticeBoardView>('list');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<NoticeDrawerMode>('read');
  const [activeNotice, setActiveNotice] = useState<Notice | null>(null);
  const [defaultType, setDefaultType] = useState<NoticeType>('announcement');
  const [toast, setToast] = useState<string | null>(null);
  const [staffNames, setStaffNames] = useState<string[]>([]);
  const recordedReadRef = useRef(new Set<string>());

  const allPinned = useMemo(
    () => getPinnedNotices(notices).filter((notice) => !isNoticeCompleted(notice)),
    [notices],
  );
  const pinnedIds = useMemo(() => allPinned.map((n) => n.id), [allPinned]);
  const { data: noticeReads = [] } = useNoticeReads(pinnedIds);
  const myUnreadPinned = unreadPinnedCount(allPinned, noticeReads, session.name);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('staff')
      .select('name')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => setStaffNames((data ?? []).map((row) => row.name)));
  }, []);

  const filtered = useMemo(
    () =>
      filterNoticesForBoard(notices, {
        tab: boardTab,
        searchQuery,
      }),
    [notices, boardTab, searchQuery],
  );

  const tabCounts = useMemo(
    () =>
      Object.fromEntries(
        NOTICE_BOARD_TABS.map((item) => [item.id, countNoticesForBoardTab(notices, item.id)]),
      ) as Record<NoticeBoardTab, number>,
    [notices],
  );

  const pinnedNotices = useMemo(
    () => filtered.filter((notice) => notice.is_pinned),
    [filtered],
  );

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }

  function handleCreateHandover(notice: Notice) {
    if (!requireSession('인수인계 등록')) return;
    router.push(`/handover?newFromNotice=${notice.id}`);
  }

  function audit() {
    return { shift: session.shift, staffName: session.name };
  }

  function syncUrl(nextTab: NoticeBoardTab, noticeId?: string | null) {
    const params = new URLSearchParams();
    if (nextTab !== 'announcement') params.set('channel', nextTab);
    if (noticeId) params.set('id', noticeId);
    const query = params.toString();
    router.replace(query ? `/notices?${query}` : '/notices', { scroll: false });
  }

  function selectTab(next: NoticeBoardTab) {
    setBoardTab(next);
    closeDrawer();
    syncUrl(next);
  }

  async function recordNoticeRead(notice: Notice) {
    const name = session.name.trim();
    if (!notice.is_pinned || !name) return;

    const sessionKey = `${notice.id}:${name}`;
    if (recordedReadRef.current.has(sessionKey)) return;

    await markNoticeRead(notice.id, name, session.shift);
    recordedReadRef.current.add(sessionKey);
    invalidateNoticeReads();
  }

  function openRead(notice: Notice) {
    setActiveNotice(notice);
    setDrawerMode('read');
    setDrawerOpen(true);
    syncUrl(boardTab, notice.id);
  }

  useEffect(() => {
    if (!drawerOpen || drawerMode !== 'read' || !activeNotice) return;
    void recordNoticeRead(activeNotice);
  }, [drawerOpen, drawerMode, activeNotice?.id, session.name]);

  function openCompose(type: NoticeType = boardTab === 'change' ? 'change' : 'announcement') {
    if (!requireSession('글쓰기')) return;
    setActiveNotice(null);
    setDefaultType(type);
    setDrawerMode('create');
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setActiveNotice(null);
    syncUrl(boardTab);
  }

  useEffect(() => {
    const param = searchParams.get('channel');
    const nextTab = parseNoticeBoardTab(param);
    if (nextTab !== boardTab) {
      setBoardTab(nextTab);
    }
  }, [searchParams, boardTab]);

  useEffect(() => {
    const id = searchParams.get('id');
    if (!id || !notices.length) return;
    const found = notices.find((notice) => notice.id === id);
    if (found) {
      setActiveNotice(found);
      setDrawerMode('read');
      setDrawerOpen(true);
      const nextTab: NoticeBoardTab = isNoticeCompleted(found)
        ? 'completed'
        : found.type === 'change'
          ? 'change'
          : 'announcement';
      setBoardTab(nextTab);
    }
  }, [searchParams, notices]);

  useEffect(() => {
    if (!drawerOpen || !activeNotice) return;
    const fresh = notices.find((notice) => notice.id === activeNotice.id);
    if (fresh) setActiveNotice(fresh);
  }, [notices, drawerOpen, activeNotice]);

  useEffect(() => {
    if (!activeNotice) return;
    const fresh = notices.find((notice) => notice.id === activeNotice.id);
    if (fresh) setActiveNotice(fresh);
  }, [notices, activeNotice]);

  async function handleSave(input: NoticeInput, id?: string) {
    if (!requireSession('저장')) return;
    if (id) {
      await updateNotice.mutateAsync({ id, input });
      await logActivity({
        entityType: 'notice',
        entityId: id,
        action: 'update',
        audit: audit(),
        summary: `공지 수정: ${input.content.slice(0, 40)}`,
      });
      showToast('글이 수정되었습니다.');
    } else {
      const created = await createNotice.mutateAsync(input);
      await logActivity({
        entityType: 'notice',
        entityId: created.id,
        action: 'create',
        audit: audit(),
        summary: `공지 추가: ${input.content.slice(0, 40)}`,
      });
      showToast('글이 등록되었습니다.');
    }
  }

  async function handleDelete(id: string) {
    const before = notices.find((notice) => notice.id === id);
    await deleteNotice.mutateAsync(id);
    if (before) {
      await logActivity({
        entityType: 'notice',
        entityId: id,
        action: 'delete',
        audit: audit(),
        summary: `공지 삭제: ${before.content.slice(0, 40)}`,
      });
    }
    closeDrawer();
    showToast('삭제되었습니다.');
  }

  async function handleToggleComplete(notice: Notice) {
    if (!requireSession('완료 처리')) return;
    await toggleComplete.mutateAsync(notice);
    showToast(notice.completed_at ? '완료를 취소했습니다.' : '완료 처리했습니다.');
  }

  async function handleTogglePin(notice: Notice, event?: React.MouseEvent) {
    event?.stopPropagation();
    if (!requireSession('고정 변경')) return;
    await togglePin.mutateAsync({ id: notice.id, isPinned: notice.is_pinned });
    showToast(notice.is_pinned ? '고정을 해제했습니다.' : '글을 고정했습니다.');
  }

  if (isLoading) {
    return <div className="empty-state">게시판을 불러오는 중…</div>;
  }

  return (
    <>
      <section className="project-board">
        <header className="project-board__head">
          <div>
            <h1>업무 게시판</h1>
            <p>공지와 업무 변경을 남기고, 교대 간 확인합니다.</p>
          </div>
          <button type="button" className="btn btn--primary" onClick={() => openCompose()}>
            + 글쓰기
          </button>
        </header>

        {myUnreadPinned > 0 ? (
          <div className="notice-read-banner" role="status">
            📌 필독 공지 <strong>{myUnreadPinned}건</strong>을 아직 확인하지 않았습니다. 글을 열면 확인으로 기록됩니다.
          </div>
        ) : null}

        <div className="project-board__toolbar">
          <div className="project-board__channels" role="tablist" aria-label="분류">
            {NOTICE_BOARD_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={boardTab === item.id}
                className={`project-board__channel${boardTab === item.id ? ' is-active' : ''}`}
                onClick={() => selectTab(item.id)}
              >
                {item.label}
                <span className="project-board__channel-count">{tabCounts[item.id]}</span>
              </button>
            ))}
          </div>

          <div className="project-board__toolbar-end">
            <div className="project-board__view-toggle" role="tablist" aria-label="보기 방식">
              <button
                type="button"
                role="tab"
                aria-selected={boardView === 'list'}
                className={boardView === 'list' ? 'is-active' : ''}
                onClick={() => setBoardView('list')}
              >
                목록
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={boardView === 'table'}
                className={boardView === 'table' ? 'is-active' : ''}
                onClick={() => setBoardView('table')}
              >
                테이블
              </button>
            </div>
            <span className="project-board__meta">{filtered.length}건</span>
          </div>
        </div>

        <div className="project-board__controls">
          <div className="project-board__search">
            <span aria-hidden>⌕</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="제목·내용·작성자 검색…"
              autoComplete="off"
              aria-label="게시판 검색"
            />
          </div>
        </div>

        {pinnedNotices.length ? (
          <div className="project-board__pinned" aria-label="고정 글">
            {pinnedNotices.map((notice) => (
              <button
                key={notice.id}
                type="button"
                className={`project-board__pin-chip project-board__pin-chip--${notice.type}`}
                onClick={() => openRead(notice)}
              >
                <span>📌</span>
                <span className="project-board__pin-type">{noticeTypeShort(notice.type)}</span>
                <span className="project-board__pin-text">{noticeListTitle(notice.content)}</span>
              </button>
            ))}
          </div>
        ) : null}

        {filtered.length ? (
          boardView === 'table' ? (
            <div className="project-board__table-wrap">
              <table className="project-board__table">
                <thead>
                  <tr>
                    <th scope="col">상태</th>
                    <th scope="col">분류</th>
                    <th scope="col">제목</th>
                    <th scope="col">작성자</th>
                    <th scope="col">작성일</th>
                    <th scope="col">유효기간</th>
                    <th scope="col">고정</th>
                    <th scope="col">인수인계</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((notice) => {
                    const expiry = formatExpiryLabel(notice.expires_at);
                    const isDone = isNoticeCompleted(notice);
                    return (
                      <tr
                        key={notice.id}
                        className={`${notice.is_pinned ? 'is-pinned' : ''}${
                          activeNotice?.id === notice.id ? ' is-reading' : ''
                        }${isDone ? ' is-done' : ''}`}
                      >
                        <td>
                          {isDone ? (
                            <span className="project-board__status project-board__status--done">완료</span>
                          ) : (
                            <button
                              type="button"
                              className="project-board__table-complete"
                              onClick={() => void handleToggleComplete(notice)}
                            >
                              완료
                            </button>
                          )}
                        </td>
                        <td>
                          <span className={`project-board__type project-board__type--${notice.type}`}>
                            {noticeTypeShort(notice.type)}
                          </span>
                        </td>
                        <td>
                          <button type="button" className="project-board__table-link" onClick={() => openRead(notice)}>
                            {noticeListTitle(notice.content)}
                          </button>
                        </td>
                        <td>{notice.author || '—'}</td>
                        <td>
                          <time dateTime={notice.updated_at || notice.created_at}>
                            {formatTime(notice.updated_at || notice.created_at)}
                          </time>
                        </td>
                        <td>
                          {expiry ? (
                            <span className={`project-board__expiry${expiry.soon ? ' is-soon' : ''}`}>
                              {expiry.text}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`project-board__table-pin${notice.is_pinned ? ' is-active' : ''}`}
                            onClick={(event) => handleTogglePin(notice, event)}
                          >
                            📌
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="project-board__table-handover"
                            onClick={() => handleCreateHandover(notice)}
                          >
                            등록
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <ul className="project-board__list">
              {filtered.map((notice) => {
                const expiry = formatExpiryLabel(notice.expires_at);
                const isDone = isNoticeCompleted(notice);
                return (
                  <li
                    key={notice.id}
                    className={`project-board__row project-board__row--${notice.type}${
                      notice.is_pinned ? ' is-pinned' : ''
                    }${activeNotice?.id === notice.id ? ' is-reading' : ''}${isDone ? ' is-done' : ''}`}
                  >
                    <button type="button" className="project-board__row-body" onClick={() => openRead(notice)}>
                      <div className="project-board__row-tags">
                        <span className={`project-board__type project-board__type--${notice.type}`}>
                          {noticeTypeShort(notice.type)}
                        </span>
                        {isDone ? <span className="project-board__status project-board__status--done">완료</span> : null}
                        {notice.is_pinned ? <span className="project-board__pin">고정</span> : null}
                        {expiry ? (
                          <span className={`project-board__expiry${expiry.soon ? ' is-soon' : ''}`}>
                            {expiry.text}
                          </span>
                        ) : null}
                      </div>
                      <p className="project-board__title">{noticeListTitle(notice.content)}</p>
                      <p className="project-board__preview">
                        {notice.content.length > 100 ? `${notice.content.slice(0, 100)}…` : notice.content}
                      </p>
                      <div className="project-board__foot">
                        <span>{notice.author || '—'}</span>
                        <time dateTime={notice.updated_at || notice.created_at}>
                          {formatTime(notice.updated_at || notice.created_at)}
                        </time>
                      </div>
                    </button>
                    <div className="project-board__row-actions">
                      <button
                        type="button"
                        className={`project-board__complete-btn${isDone ? ' is-done' : ''}`}
                        title={isDone ? '완료 취소' : '완료 처리'}
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleToggleComplete(notice);
                        }}
                      >
                        {isDone ? '✓' : '○'}
                      </button>
                      <button
                        type="button"
                        className="project-board__handover-btn"
                        title="인수인계로 등록"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleCreateHandover(notice);
                        }}
                      >
                        →
                      </button>
                      <button
                        type="button"
                        className={`project-board__pin-btn${notice.is_pinned ? ' is-active' : ''}`}
                        title={notice.is_pinned ? '고정 해제' : '고정'}
                        onClick={(event) => handleTogglePin(notice, event)}
                      >
                        📌
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )
        ) : (
          <div className="empty-state">
            {searchQuery
              ? '검색 조건에 맞는 글이 없습니다.'
              : boardTab === 'completed'
                ? '완료된 글이 없습니다.'
                : boardTab === 'change'
                  ? '진행 중인 변경 글이 없습니다.'
                  : '진행 중인 공지가 없습니다.'}
          </div>
        )}
      </section>

      <NoticeDrawer
        open={drawerOpen}
        mode={drawerMode}
        notice={activeNotice}
        defaultType={defaultType}
        authorLabel={authorLabel}
        isManager={isManager}
        onClose={closeDrawer}
        onModeChange={setDrawerMode}
        onSave={handleSave}
        onDelete={handleDelete}
        onTogglePin={handleTogglePin}
        onToggleComplete={handleToggleComplete}
        onCreateHandover={handleCreateHandover}
        activeStaffNames={staffNames}
        currentStaffName={session.name}
      />

      {toast ? <div className="toast toast--project">{toast}</div> : null}
    </>
  );
}
