/**
 * 업로드 전 브라우저에서 이미지를 적당히 줄인다.
 * 카톡 압축본보다 나은 화질을 유지하면서 용량 제한(2MB)을 지키는 것이 목적.
 */

export const IMAGE_MAX_EDGE = 2560;
export const IMAGE_QUALITY = 0.85;

/** 긴 변을 maxEdge에 맞춘 목표 크기 (작으면 그대로) */
export function targetImageSize(
  width: number,
  height: number,
  maxEdge: number = IMAGE_MAX_EDGE,
): { width: number; height: number } {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxEdge) return { width, height };
  const ratio = maxEdge / longEdge;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

function replaceExtension(filename: string, ext: string): string {
  const base = filename.replace(/\.[^.]+$/, '');
  return `${base}.${ext}`;
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // 일부 포맷/브라우저에서 실패하면 <img> 로딩으로 폴백
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('이미지를 불러오지 못했습니다.'));
    };
    image.src = url;
  });
}

function drawToBlob(
  source: ImageBitmap | HTMLImageElement,
  width: number,
  height: number,
  quality: number,
): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return Promise.resolve(null);
  context.drawImage(source, 0, 0, width, height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/**
 * 필요할 때만 리사이즈/재인코딩한다.
 * - 이미 충분히 작으면(긴 변·용량 모두) 원본 그대로 반환
 * - GIF(움짤)는 재인코딩하면 애니메이션이 사라지므로 그대로 둔다
 * - 실패하면 원본을 반환해 업로드 자체는 막지 않는다
 */
export async function compressImageFile(
  file: File,
  options?: { maxEdge?: number; maxBytes?: number },
): Promise<File> {
  const maxEdge = options?.maxEdge ?? IMAGE_MAX_EDGE;
  const maxBytes = options?.maxBytes ?? Number.POSITIVE_INFINITY;

  if (typeof document === 'undefined') return file;
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;

  let source: ImageBitmap | HTMLImageElement;
  try {
    source = await loadBitmap(file);
  } catch {
    return file;
  }

  const sourceWidth = source.width;
  const sourceHeight = source.height;
  const needsResize = Math.max(sourceWidth, sourceHeight) > maxEdge;
  const needsShrink = file.size > maxBytes;
  if (!needsResize && !needsShrink) {
    if ('close' in source) source.close();
    return file;
  }

  // 크기 → 품질 → 크기 순으로 단계적으로 줄인다
  const attempts: { maxEdge: number; quality: number }[] = [
    { maxEdge, quality: IMAGE_QUALITY },
    { maxEdge, quality: 0.7 },
    { maxEdge: Math.min(maxEdge, 1920), quality: 0.7 },
    { maxEdge: Math.min(maxEdge, 1280), quality: 0.65 },
  ];

  let result: Blob | null = null;
  for (const attempt of attempts) {
    const { width, height } = targetImageSize(sourceWidth, sourceHeight, attempt.maxEdge);
    result = await drawToBlob(source, width, height, attempt.quality);
    if (result && result.size <= maxBytes) break;
  }

  if ('close' in source) source.close();

  if (!result) return file;
  // 재인코딩 결과가 원본보다 크면 원본 유지 (이미 최적화된 파일 등)
  if (!needsResize && result.size >= file.size) return file;

  return new File([result], replaceExtension(file.name, 'jpg'), { type: 'image/jpeg' });
}
