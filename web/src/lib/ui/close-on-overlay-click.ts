'use client';

import type { MouseEvent as ReactMouseEvent } from 'react';

/**
 * 모달 오버레이 "바깥 클릭 닫기"의 안전판.
 *
 * 입력창에서 텍스트를 드래그하다가 오버레이 위에서 마우스를 놓으면, 브라우저가
 * 공통 조상(오버레이)에 click을 합성해 모달이 닫히고 작성 내용이 날아간다.
 * 마우스를 누르기 시작한 지점까지 오버레이일 때만 닫아 이를 막는다.
 */

let lastMouseDownTarget: EventTarget | null = null;

if (typeof window !== 'undefined') {
  // capture 단계에서 기록 — stopPropagation의 영향을 받지 않는다
  window.addEventListener(
    'mousedown',
    (event) => {
      lastMouseDownTarget = event.target;
    },
    true,
  );
}

export function closeOnOverlayClick(onClose?: () => void) {
  return (event: ReactMouseEvent) => {
    // 모달 내부에서 올라온(버블링) 클릭은 무시
    if (event.target !== event.currentTarget) return;
    // 드래그 시작점이 오버레이가 아니면(입력창 등) 닫지 않는다
    if (lastMouseDownTarget && lastMouseDownTarget !== event.currentTarget) return;
    onClose?.();
  };
}
