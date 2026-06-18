'use client';

import { useState } from 'react';

type CardCommentComposerProps = {
  staffName: string;
  placeholder?: string;
  disabled?: boolean;
  compact?: boolean;
  onSubmit: (content: string) => Promise<void>;
};

function CommentBubbleIcon() {
  return (
    <svg
      className="card-comment-composer__icon-svg"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M13.333 2.667H2.667c-.736 0-1.334.597-1.334 1.333v5.333c0 .737.598 1.334 1.334 1.334h2.666L6 12.667l1.333-1.333h6c.737 0 1.334-.597 1.334-1.334V4c0-.736-.597-1.333-1.334-1.333Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CardCommentComposer({
  staffName,
  placeholder = '댓글을 입력하세요…',
  disabled = false,
  compact = false,
  onSubmit,
}: CardCommentComposerProps) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const author = staffName.trim();

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
      aria-label={author ? `${author} 댓글 입력` : '댓글 입력'}
    >
      <span className="card-comment-composer__icon" title={author || undefined} aria-hidden>
        <CommentBubbleIcon />
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
