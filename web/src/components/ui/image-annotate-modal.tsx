'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { targetImageSize } from '@/lib/handover/image-compress';

/**
 * 사진 주석 편집기 — 첨부 사진 위에 동그라미·화살표·펜으로 표시하고,
 * 저장하면 원본에 구워진(합성된) 한 장의 이미지가 된다.
 * 주석을 별도 데이터로 저장하지 않으므로 기존 미리보기·브리핑 화면에서 그대로 보인다.
 */

type Tool = 'ellipse' | 'arrow' | 'pen';

type Point = { x: number; y: number };

type Shape = {
  tool: Tool;
  color: string;
  /** pen은 전체 경로, ellipse/arrow는 [시작점, 끝점] */
  points: Point[];
};

const TOOLS: { value: Tool; label: string }[] = [
  { value: 'ellipse', label: '○ 동그라미' },
  { value: 'arrow', label: '↗ 화살표' },
  { value: 'pen', label: '✎ 펜' },
];

const COLORS = [
  { value: '#e11d48', label: '빨강' },
  { value: '#f59e0b', label: '주황' },
  { value: '#2563eb', label: '파랑' },
];

const MAX_CANVAS_EDGE = 2048;

function drawShape(context: CanvasRenderingContext2D, shape: Shape, lineWidth: number) {
  const points = shape.points;
  if (points.length < 2) return;
  context.strokeStyle = shape.color;
  context.lineWidth = lineWidth;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  if (shape.tool === 'pen') {
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) context.lineTo(points[i].x, points[i].y);
    context.stroke();
    return;
  }

  const start = points[0];
  const end = points[points.length - 1];

  if (shape.tool === 'arrow') {
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();

    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const head = lineWidth * 4;
    context.beginPath();
    context.moveTo(end.x, end.y);
    context.lineTo(end.x - head * Math.cos(angle - Math.PI / 6), end.y - head * Math.sin(angle - Math.PI / 6));
    context.moveTo(end.x, end.y);
    context.lineTo(end.x - head * Math.cos(angle + Math.PI / 6), end.y - head * Math.sin(angle + Math.PI / 6));
    context.stroke();
    return;
  }

  context.beginPath();
  context.ellipse(
    (start.x + end.x) / 2,
    (start.y + end.y) / 2,
    Math.max(Math.abs(end.x - start.x) / 2, 1),
    Math.max(Math.abs(end.y - start.y) / 2, 1),
    0,
    0,
    Math.PI * 2,
  );
  context.stroke();
}

type ImageAnnotateModalProps = {
  imageUrl: string;
  filename?: string;
  onClose: () => void;
  /** 주석이 합성된 이미지 파일 — 성공하면 모달을 닫는 것은 호출한 쪽 책임 */
  onSave: (file: File) => Promise<void>;
};

export function ImageAnnotateModal({ imageUrl, filename, onClose, onSave }: ImageAnnotateModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sourceRef = useRef<ImageBitmap | HTMLImageElement | null>(null);
  const shapesRef = useRef<Shape[]>([]);
  const draftRef = useRef<Shape | null>(null);

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('ellipse');
  const [color, setColor] = useState(COLORS[0].value);
  const [shapeCount, setShapeCount] = useState(0);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const source = sourceRef.current;
    if (!canvas || !source) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const lineWidth = Math.max(4, Math.round(Math.max(canvas.width, canvas.height) / 240));
    for (const shape of shapesRef.current) drawShape(context, shape, lineWidth);
    if (draftRef.current) drawShape(context, draftRef.current, lineWidth);
  }, []);

  // 사진 로드 — fetch를 거쳐야 캔버스가 오염(taint)되지 않아 저장이 가능하다
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(imageUrl);
        if (!response.ok) throw new Error('load failed');
        const blob = await response.blob();

        let source: ImageBitmap | HTMLImageElement | null = null;
        if (typeof createImageBitmap === 'function') {
          source = await createImageBitmap(blob).catch(() => null);
        }
        if (!source) {
          const objectUrl = URL.createObjectURL(blob);
          source = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('decode failed'));
            image.src = objectUrl;
          }).finally(() => URL.revokeObjectURL(objectUrl));
        }

        if (cancelled) return;
        sourceRef.current = source;
        const canvas = canvasRef.current;
        if (canvas) {
          const size = targetImageSize(source.width, source.height, MAX_CANVAS_EDGE);
          canvas.width = size.width;
          canvas.height = size.height;
        }
        setReady(true);
        redraw();
      } catch {
        if (!cancelled) setLoadError(true);
      }
    })();
    return () => {
      cancelled = true;
      const source = sourceRef.current;
      if (source && 'close' in source) source.close();
      sourceRef.current = null;
    };
  }, [imageUrl, redraw]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  function canvasPoint(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!ready || saving) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = canvasPoint(event);
    draftRef.current = { tool, color, points: [point, point] };
    redraw();
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const draft = draftRef.current;
    if (!draft) return;
    event.preventDefault();
    const point = canvasPoint(event);
    if (draft.tool === 'pen') draft.points.push(point);
    else draft.points = [draft.points[0], point];
    redraw();
  }

  function handlePointerUp() {
    const draft = draftRef.current;
    if (!draft) return;
    draftRef.current = null;
    // 제자리 클릭(이동 거의 없음)은 버린다 — 실수로 점이 찍히는 것 방지
    const start = draft.points[0];
    const end = draft.points[draft.points.length - 1];
    const moved =
      draft.points.length > 2 || Math.abs(end.x - start.x) > 3 || Math.abs(end.y - start.y) > 3;
    if (moved) {
      shapesRef.current = [...shapesRef.current, draft];
      setShapeCount(shapesRef.current.length);
    }
    redraw();
  }

  function handleUndo() {
    shapesRef.current = shapesRef.current.slice(0, -1);
    setShapeCount(shapesRef.current.length);
    redraw();
  }

  async function handleSave() {
    const canvas = canvasRef.current;
    if (!canvas || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.88),
      );
      if (!blob) throw new Error('encode failed');
      const base = (filename || 'photo').replace(/\.[^.]+$/, '');
      await onSave(new File([blob], `${base}-주석.jpg`, { type: 'image/jpeg' }));
    } catch {
      setSaveError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setSaving(false);
    }
  }

  const dialog = (
    <div className="image-annotate" role="dialog" aria-modal="true" aria-label="사진 주석 편집">
      <div className="image-annotate__toolbar">
        <div className="image-annotate__tools" role="group" aria-label="그리기 도구">
          {TOOLS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`image-annotate__tool${tool === item.value ? ' is-active' : ''}`}
              onClick={() => setTool(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="image-annotate__colors" role="group" aria-label="색상">
          {COLORS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`image-annotate__color${color === item.value ? ' is-active' : ''}`}
              style={{ background: item.value }}
              aria-label={item.label}
              title={item.label}
              onClick={() => setColor(item.value)}
            />
          ))}
        </div>
        <button
          type="button"
          className="image-annotate__undo"
          onClick={handleUndo}
          disabled={!shapeCount || saving}
        >
          ↩ 되돌리기
        </button>
      </div>

      <div className="image-annotate__stage">
        {loadError ? (
          <p className="image-annotate__status">사진을 불러오지 못했습니다.</p>
        ) : (
          <>
            {!ready ? <p className="image-annotate__status">사진을 불러오는 중…</p> : null}
            <canvas
              ref={canvasRef}
              className="image-annotate__canvas"
              style={ready ? undefined : { visibility: 'hidden' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
          </>
        )}
      </div>

      <div className="image-annotate__footer">
        <p className="image-annotate__hint">
          {saveError ?? '저장하면 이 사진이 주석이 그려진 사진으로 바뀝니다.'}
        </p>
        <div className="image-annotate__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
            취소
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSave}
            disabled={!ready || !shapeCount || saving}
          >
            {saving ? '저장 중…' : '주석 저장'}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(dialog, document.body);
}
