'use client';

import { useRef } from 'react';

/** 오버레이 클릭으로만 닫기 — 입력란 텍스트 드래그가 바깥에서 끝나도 닫히지 않음 */
export function useDismissibleOverlay(onClose: () => void) {
  const overlayPointerDownRef = useRef(false);

  return {
    overlayProps: {
      onPointerDown: (event: React.PointerEvent<HTMLElement>) => {
        if (event.target === event.currentTarget) overlayPointerDownRef.current = true;
      },
      onPointerUp: (event: React.PointerEvent<HTMLElement>) => {
        if (event.target === event.currentTarget && overlayPointerDownRef.current) onClose();
        overlayPointerDownRef.current = false;
      },
    },
    panelProps: {
      onPointerDown: () => {
        overlayPointerDownRef.current = false;
      },
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        event.stopPropagation();
      },
    },
  };
}
