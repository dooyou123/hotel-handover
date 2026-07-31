'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CardAttachment } from '@/lib/handover/types';

const ZOOM_SCALE = 2.5;
const DRAG_THRESHOLD_PX = 6;

type ImagePreviewModalProps = {
  open: boolean;
  attachments: Pick<CardAttachment, 'url' | 'filename'>[];
  index: number;
  onClose: () => void;
  onChangeIndex?: (index: number) => void;
};

export function ImagePreviewModal({
  open,
  attachments,
  index,
  onClose,
  onChangeIndex,
}: ImagePreviewModalProps) {
  const attachment = attachments[index];
  const hasMultiple = attachments.length > 1;

  const [zoomed, setZoomed] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    moved: boolean;
  } | null>(null);

  // 사진이 바뀌거나 닫히면 줌 상태 초기화
  useEffect(() => {
    setZoomed(false);
    setOffset({ x: 0, y: 0 });
    setDragging(false);
    dragRef.current = null;
  }, [index, open, attachment?.url]);

  function clampOffset(x: number, y: number): { x: number; y: number } {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return { x, y };
    // 확대된 이미지가 화면 밖으로 완전히 사라지지 않을 만큼만 이동 허용
    const maxX = (rect.width * (ZOOM_SCALE - 1)) / 2 / ZOOM_SCALE + rect.width * 0.25;
    const maxY = (rect.height * (ZOOM_SCALE - 1)) / 2 / ZOOM_SCALE + rect.height * 0.25;
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLImageElement>) {
    if (!zoomed) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      baseX: offset.x,
      baseY: offset.y,
      moved: false,
    };
    setDragging(true);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLImageElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX) {
      drag.moved = true;
    }
    setOffset(clampOffset(drag.baseX + dx / ZOOM_SCALE, drag.baseY + dy / ZOOM_SCALE));
  }

  const suppressClickRef = useRef(false);

  function handlePointerUp(event: React.PointerEvent<HTMLImageElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.moved) suppressClickRef.current = true;
    dragRef.current = null;
    setDragging(false);
  }

  function handleImageClick(event: React.MouseEvent<HTMLImageElement>) {
    event.stopPropagation();
    // 드래그 직후의 click은 무시 (패닝과 토글 충돌 방지)
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (zoomed) {
      setZoomed(false);
      setOffset({ x: 0, y: 0 });
    } else {
      setZoomed(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (!onChangeIndex || !hasMultiple) return;
      if (event.key === 'ArrowLeft') {
        onChangeIndex((index - 1 + attachments.length) % attachments.length);
      }
      if (event.key === 'ArrowRight') {
        onChangeIndex((index + 1) % attachments.length);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [attachments.length, hasMultiple, index, onChangeIndex, onClose, open]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !attachment?.url) return null;

  const dialog = (
    <div className="image-preview-lightbox" onClick={onClose} role="presentation">
      <button
        type="button"
        className="image-preview-lightbox__close"
        aria-label="닫기"
        onClick={onClose}
      >
        <span className="image-preview-lightbox__close-icon" aria-hidden="true">
          ✕
        </span>
        <span>닫기</span>
      </button>

      <div className="image-preview-lightbox__toolbar" onClick={(event) => event.stopPropagation()}>
        <span className="image-preview-lightbox__title">
          첨부 사진
          {hasMultiple ? ` ${index + 1}/${attachments.length}` : ''}
        </span>
        <span className="image-preview-lightbox__zoom-hint">
          {zoomed ? '드래그로 이동 · 클릭해 축소' : '클릭해 확대'}
        </span>
      </div>

      <div className="image-preview-lightbox__stage" onClick={(event) => event.stopPropagation()}>
        {hasMultiple && onChangeIndex ? (
          <button
            type="button"
            className="image-preview-lightbox__nav image-preview-lightbox__nav--prev"
            aria-label="이전 사진"
            onClick={() => onChangeIndex((index - 1 + attachments.length) % attachments.length)}
          >
            ‹
          </button>
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={attachment.url}
          alt={attachment.filename || '첨부 사진'}
          className={[
            zoomed ? 'is-zoomed' : '',
            dragging ? 'is-dragging' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={
            zoomed
              ? { transform: `scale(${ZOOM_SCALE}) translate(${offset.x}px, ${offset.y}px)` }
              : undefined
          }
          draggable={false}
          onClick={handleImageClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
        {hasMultiple && onChangeIndex ? (
          <button
            type="button"
            className="image-preview-lightbox__nav image-preview-lightbox__nav--next"
            aria-label="다음 사진"
            onClick={() => onChangeIndex((index + 1) % attachments.length)}
          >
            ›
          </button>
        ) : null}
      </div>

      {attachment.filename ? (
        <p className="image-preview-lightbox__caption" onClick={(event) => event.stopPropagation()}>
          {attachment.filename}
        </p>
      ) : null}
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(dialog, document.body);
}
