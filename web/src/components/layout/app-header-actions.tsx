'use client';

import Link from 'next/link';
import { HeaderActionsSlot } from '@/components/layout/header-actions';
import { FeedbackButton } from '@/components/feedback/feedback-modal';

export function AppHeaderActions() {
  return (
    <div className="header__actions-inner">
      <div className="header__actions-page">
        <HeaderActionsSlot />
      </div>
      <div className="header__actions-utils">
        <FeedbackButton />
        <Link href="/help" className="btn btn--ghost btn--small">
          도움말
        </Link>
      </div>
    </div>
  );
}
