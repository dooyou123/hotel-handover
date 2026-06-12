'use client';

import { useState } from 'react';
import { staffInitials } from '@/lib/handover/staff-avatar';

type CardCommentComposerProps = {
  staffName: string;
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
  onSubmit: (content: string) => Promise<void>;
};

export function CardCommentComposer({
  staffName,
  placeholder = '댓글을 입력하세요…',
  disabled = false,
  compact = false,
  onSubmit,
}: CardCommentComposerProps) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const content = value.trim();
    if (!content || loading || disabled) return;
    setLoading(true);
    try {
      await onSubmit(content);
      setValue('');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`card-comment-composer${compact ? ' card-comment-composer--compact' : ''}`}
      role="group"
      aria-label="댓글 입력"
    >
      <span className="card-comment-composer__avatar" aria-hidden>
        {staffInitials(staffName)}
      </span>
      <input
        type="text"
        className="card-comment-composer__input"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        disabled={disabled || loading}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            void handleSubmit();
          }
        }}
      />
    </div>
  );
}
