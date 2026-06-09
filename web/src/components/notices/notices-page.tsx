'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { logActivity } from '@/lib/handover/activity';
import { formatTime } from '@/lib/handover/card-utils';
import { noticeListTitle, noticeTypeShort } from '@/lib/handover/notice-utils';
import { formatExpiryLabel } from '@/lib/handover/shift-summary';
import { useNotices } from '@/lib/handover/use-notices';
import { useIsManager } from '@/lib/handover/use-cards';
import { useWorkSession } from '@/lib/handover/use-work-session';
import {
  filterNoticesForBoard,
  NOTICE_SHIFT_FILTERS,
  type NoticeBoardView,
  type NoticeShiftFilter,
} from '@/lib/notices/filter';
import {
  getNoticeChannel,
  isNoticeChannelId,
  NOTICE_CHANNELS,
  type NoticeChannelId,
} from '@/lib/notices/channels';
import type { Notice, NoticeInput, NoticeType } from '@/lib/handover/types';
import { NoticeDrawer, type NoticeDrawerMode } from './notice-drawer';

export function NoticesPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notices, isLoading, createNotice, updateNotice, deleteNotice, togglePin } = useNotices();
  const { data: isManager = false } = useIsManager();
  const { session, requireSession, authorLabel } = useWorkSession();

  const channelParam = searchParams.get('channel');
  const initialChannel: NoticeChannelId = isNoticeChannelId(channelParam) ? channelParam : 'all';

  const [channelId, setChannelId] = useState<NoticeChannelId>(initialChannel);
  const [searchQuery, setSearchQuery] = useState('');
  const [shiftFilter, setShiftFilter] = useState<NoticeShiftFilter>('all');
  const [boardView, setBoardView] = useState<NoticeBoardView>('list');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<NoticeDrawerMode>('read');
  const [activeNotice, setActiveNotice] = useState<Notice | null>(null);
  const [defaultType, setDefaultType] = useState<NoticeType>('announcement');
  const [toast, setToast] = useState<string | null>(null);

  const channel = getNoticeChannel(channelId);

  const filtered = useMemo(
    () =>
      filterNoticesForBoard(notices, {
        channelId,
        searchQuery,
        shiftFilter,
      }),
    [notices, channelId, searchQuery, shiftFilter],
  );

  const pinnedNotices = useMemo(
    () => filtered.filter((notice) => notice.is_pinned),
    [filtered],
  );

  const channelCounts = useMemo(
    () => ({
      all: notices.length,
      announcement: notices.filter((n) => n.type === 'announcement').length,
      change: notices.filter((n) => n.type === 'change').length,
    }),
    [notices],
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

  function syncUrl(nextChannel: NoticeChannelId, noticeId?: string | null) {
    const params = new URLSearchParams();
    if (nextChannel !== 'all') params.set('channel', nextChannel);
    if (noticeId) params.set('id', noticeId);
    const query = params.toString();
    router.replace(query ? `/notices?${query}` : '/notices', { scroll: false });
  }

  function selectChannel(next: NoticeChannelId) {
    setChannelId(next);
    closeDrawer();
    syncUrl(next);
  }

  function openRead(notice: Notice) {
    setActiveNotice(notice);
    setDrawerMode('read');
    setDrawerOpen(true);
    syncUrl(channelId, notice.id);
  }

  function openCompose(type: NoticeType = channel.type ?? 'announcement') {
    if (!requireSession('글쓰기')) return;
    setActiveNotice(null);
    setDefaultType(type);
    setDrawerMode('create');
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setActiveNotice(null);
    syncUrl(channelId);
  }

  useEffect(() => {
    const param = searchParams.get('channel');
    if (isNoticeChannelId(param) && param !== channelId) {
      setChannelId(param);
    }
  }, [searchParams, channelId]);

  useEffect(() => {
    const id = searchParams.get('id');
    if (!id || !notices.length) return;
    const found = notices.find((notice) => notice.id === id);
    if (found) {
      setActiveNotice(found);
      setDrawerMode('read');
      setDrawerOpen(true);
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

        <div className="project-board__toolbar">
          <div className="project-board__channels" role="tablist" aria-label="분류">
            {NOTICE_CHANNELS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={channelId === item.id}
                className={`project-board__channel${channelId === item.id ? ' is-active' : ''}`}
                onClick={() => selectChannel(item.id)}
              >
                {item.name}
                <span className="project-board__channel-count">{channelCounts[item.id]}</span>
              </button>
            ))}
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

          <div className="project-board__shift-filters" role="tablist" aria-label="교대 필터">
            {NOTICE_SHIFT_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={shiftFilter === item.id}
                className={`project-board__shift${shiftFilter === item.id ? ' is-active' : ''}`}
                onClick={() => setShiftFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

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
                    return (
                      <tr
                        key={notice.id}
                        className={`${notice.is_pinned ? 'is-pinned' : ''}${
                          activeNotice?.id === notice.id ? ' is-reading' : ''
                        }`}
                      >
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
                return (
                  <li
                    key={notice.id}
                    className={`project-board__row project-board__row--${notice.type}${
                      notice.is_pinned ? ' is-pinned' : ''
                    }${activeNotice?.id === notice.id ? ' is-reading' : ''}`}
                  >
                    <button type="button" className="project-board__row-body" onClick={() => openRead(notice)}>
                      <div className="project-board__row-tags">
                        <span className={`project-board__type project-board__type--${notice.type}`}>
                          {noticeTypeShort(notice.type)}
                        </span>
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
                  </li>
                );
              })}
            </ul>
          )
        ) : (
          <div className="empty-state">
            {searchQuery || shiftFilter !== 'all' ? '검색·필터 조건에 맞는 글이 없습니다.' : '등록된 글이 없습니다.'}
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
        onCreateHandover={handleCreateHandover}
      />

      {toast ? <div className="toast toast--project">{toast}</div> : null}
    </>
  );
}
