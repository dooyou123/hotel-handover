'use client';

import { useState } from 'react';
import { HeaderActionsSlot } from '@/components/layout/header-actions';
import { FeedbackButton } from '@/components/feedback/feedback-modal';
import { RoomSearchModal } from '@/components/layout/room-search-modal';

export function AppHeaderActions() {
  const [roomSearchOpen, setRoomSearchOpen] = useState(false);

  return (
    <>
      <div className="header__actions-inner">
        <div className="header__actions-page">
          <HeaderActionsSlot />
        </div>
        <div className="header__actions-utils">
          <button
            type="button"
            className="btn btn--ghost btn--small header__room-search"
            onClick={() => setRoomSearchOpen(true)}
            aria-label="객실 검색"
          >
            🔍 객실
          </button>
          <FeedbackButton />
        </div>
      </div>
      <RoomSearchModal open={roomSearchOpen} onClose={() => setRoomSearchOpen(false)} />
    </>
  );
}
