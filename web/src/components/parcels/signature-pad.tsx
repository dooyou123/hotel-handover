'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

export type SignaturePadHandle = {
  clear: () => void;
  isEmpty: () => boolean;
  toDataUrl: () => string | null;
};

type SignaturePadProps = {
  disabled?: boolean;
};

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad(
  { disabled = false },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasStrokeRef = useRef(false);
  const [hasStroke, setHasStroke] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      const hadStroke = hasStrokeRef.current;
      canvas!.width = Math.floor(rect.width * ratio);
      canvas!.height = Math.floor(rect.height * ratio);
      const ctx = canvas!.getContext('2d');
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#0f172a';
      if (hadStroke) {
        hasStrokeRef.current = false;
        setHasStroke(false);
      }
    }

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(ratio, ratio);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#0f172a';
    hasStrokeRef.current = false;
    setHasStroke(false);
  }

  useImperativeHandle(ref, () => ({
    clear,
    isEmpty: () => !hasStrokeRef.current,
    toDataUrl: () => {
      const canvas = canvasRef.current;
      if (!canvas || !hasStrokeRef.current) return null;
      return canvas.toDataURL('image/png');
    },
  }));

  function pointFromEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function startDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const point = pointFromEvent(event);
    if (!canvas || !ctx || !point) return;

    drawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || disabled) return;
    const ctx = canvasRef.current?.getContext('2d');
    const point = pointFromEvent(event);
    if (!ctx || !point) return;

    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    if (!hasStrokeRef.current) {
      hasStrokeRef.current = true;
      setHasStroke(true);
    }
  }

  function endDraw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div className="signature-pad">
      <canvas
        ref={canvasRef}
        className="signature-pad__canvas"
        aria-label="서명"
        onPointerDown={startDraw}
        onPointerMove={draw}
        onPointerUp={endDraw}
        onPointerLeave={endDraw}
        onPointerCancel={endDraw}
      />
      {!hasStroke ? <span className="signature-pad__hint">여기에 서명해 주세요</span> : null}
      <button type="button" className="signature-pad__clear" onClick={clear} disabled={disabled || !hasStroke}>
        지우기
      </button>
    </div>
  );
});
