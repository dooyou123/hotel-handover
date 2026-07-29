'use client';

import { useEffect, useRef, useState } from 'react';
import { SearchHighlight } from '@/components/handover/search-highlight';
import { CARD_BODY_PREVIEW_MAX_LINES, isLongPreviewText } from '@/lib/handover/card-body-preview';

type PreviewFieldProps = {
  label: string;
  text: string;
  searchQuery: string;
  collapsible?: boolean;
  emphasize?: boolean;
  clampLines?: number;
};

function PreviewField({
  label,
  text,
  searchQuery,
  collapsible = true,
  emphasize = false,
  clampLines,
}: PreviewFieldProps) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(() => isLongPreviewText(text, clampLines));
  const textRef = useRef<HTMLDivElement>(null);

  // 열 폭이 좁으면 글자 수 추정만으로는 잘림 여부를 알 수 없어 실제 높이로 판정한다.
  useEffect(() => {
    if (!collapsible || expanded) return;
    const node = textRef.current;
    if (!node) return;
    const measure = () => setOverflowing(node.scrollHeight - node.clientHeight > 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [collapsible, expanded, text, clampLines]);

  const long = collapsible && overflowing;

  return (
    <div
      className={[
        'project-list-row__content-field',
        emphasize ? 'project-list-row__content-field--action' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="project-list-row__content-label">{label}</span>
      <div
        ref={textRef}
        className={[
          'project-list-row__content-text',
          collapsible && !expanded ? 'is-clamped' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={
          collapsible && !expanded
            ? ({
                '--preview-clamp-lines': String(clampLines ?? CARD_BODY_PREVIEW_MAX_LINES),
              } as React.CSSProperties)
            : undefined
        }
      >
        <SearchHighlight text={text} query={searchQuery} />
      </div>
      {long ? (
        <button
          type="button"
          className="project-list-row__content-toggle"
          aria-expanded={expanded}
          onClick={(event) => {
            event.stopPropagation();
            setExpanded((value) => !value);
          }}
        >
          {expanded ? '접기' : '더 보기'}
        </button>
      ) : null}
    </div>
  );
}

type HandoverCardBodyPreviewProps = {
  searchQuery?: string;
  nextAction?: string;
  details?: string;
  resolution?: string;
  clampLines?: number;
  /** false면 본문 전체 표시(더 보기 없음) */
  collapsible?: boolean;
};

export function HandoverCardBodyPreview({
  searchQuery = '',
  nextAction = '',
  details = '',
  resolution = '',
  clampLines = CARD_BODY_PREVIEW_MAX_LINES,
  collapsible = true,
}: HandoverCardBodyPreviewProps) {
  const fields: { label: string; text: string; emphasize?: boolean; collapsible?: boolean }[] = [];

  if (nextAction) {
    fields.push({ label: '다음 조치', text: nextAction, emphasize: true, collapsible });
  }
  if (details) {
    fields.push({ label: '상세', text: details, collapsible });
  }
  if (resolution) {
    fields.push({ label: '처리 결과', text: resolution, collapsible });
  }

  if (!fields.length) return null;

  return (
    <div className="project-list-row__content-block">
      {fields.map((field) => (
        <PreviewField
          key={field.label}
          label={field.label}
          text={field.text}
          searchQuery={searchQuery}
          emphasize={field.emphasize}
          collapsible={field.collapsible}
          clampLines={clampLines}
        />
      ))}
    </div>
  );
}
