import { DEFAULT_HOTEL_ID } from '@/lib/constants';
import { createClient } from '@/lib/supabase/client';
import { getSupabasePublicEnv } from '@/lib/supabase/env';

const BUCKET = 'schedule-board';
const MAX_BYTES = 8 * 1024 * 1024;

export type ScheduleBoardImage = {
  hotel_id: string;
  month_key: string;
  storage_path: string;
  filename: string;
  updated_at: string;
  updated_by: string | null;
  updated_by_label: string;
  current_version: number;
  note: string;
  url: string;
};

export type ScheduleBoardVersion = {
  id: string;
  hotel_id: string;
  month_key: string;
  version: number;
  storage_path: string;
  filename: string;
  note: string;
  created_at: string;
  created_by: string | null;
  created_by_label: string;
  url: string;
};

export type ScheduleBoardRead = {
  version_id: string;
  staff_name: string;
  shift: string;
  read_at: string;
};

export function currentMonthKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey.trim());
  if (!match) return currentMonthKey();
  const date = new Date(Number(match[1]), Number(match[2]) - 1 + delta, 1);
  return currentMonthKey(date);
}

export function formatMonthLabel(monthKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(monthKey.trim());
  if (!match) return monthKey;
  return `${match[1]}년 ${Number(match[2])}월`;
}

export function isValidMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value.trim());
}

/** 메모에서 `@직원이름` 멘션을 찾아 직원 명단과 매칭합니다. 긴 이름 우선으로 검사합니다. */
export function extractScheduleMentions(note: string, staffNames: string[]): string[] {
  const text = note ?? '';
  if (!text.includes('@')) return [];
  return [...staffNames]
    .sort((a, b) => b.length - a.length)
    .filter((name) => name.trim() && text.includes(`@${name}`));
}

export function buildScheduleBoardPublicUrl(storagePath: string, supabaseUrl: string): string {
  const encodedPath = storagePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  const base = supabaseUrl.replace(/\/$/, '');
  return `${base}/storage/v1/object/public/${BUCKET}/${encodedPath}`;
}

export function getScheduleBoardUrl(storagePath: string): string {
  const { url } = getSupabasePublicEnv();
  return buildScheduleBoardPublicUrl(storagePath, url);
}

const IMAGE_SELECT =
  'hotel_id, month_key, storage_path, filename, updated_at, updated_by, updated_by_label, current_version, note';
const VERSION_SELECT =
  'id, hotel_id, month_key, version, storage_path, filename, note, created_at, created_by, created_by_label';

function withUrl<T extends { storage_path: string }>(row: T): T & { url: string } {
  return { ...row, url: getScheduleBoardUrl(row.storage_path) };
}

async function assertLoggedInUser(
  supabase: ReturnType<typeof createClient>,
): Promise<{ id: string }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('로그인이 필요합니다.');
  return user;
}

async function assertScheduleManager(
  supabase: ReturnType<typeof createClient>,
): Promise<{ id: string }> {
  const user = await assertLoggedInUser(supabase);
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (profile?.role !== 'manager') {
    throw new Error('매니저만 스케줄을 삭제할 수 있습니다.');
  }
  return user;
}

export type ScheduleConfirmAlert = {
  monthKey: string;
  versionId: string;
  version: number;
  note: string;
  updatedAt: string;
  url: string;
};

/** 호명(@이름)됐지만 아직 확인하지 않은 최신 버전 목록 */
export async function fetchScheduleConfirmAlerts(
  staffName: string,
): Promise<ScheduleConfirmAlert[]> {
  const name = staffName.trim();
  if (!name) return [];

  const supabase = createClient();
  const { data: images, error } = await supabase
    .from('schedule_board_images')
    .select('month_key, note, current_version, updated_at, storage_path')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .order('month_key', { ascending: false });
  if (error) throw error;

  const candidates = (images ?? []).filter((row) => {
    const note = String((row as { note?: string }).note ?? '');
    return note.includes(`@${name}`);
  }) as Array<{
    month_key: string;
    note: string;
    current_version: number;
    updated_at: string;
    storage_path: string;
  }>;
  if (!candidates.length) return [];

  const versionKeys = candidates.map((c) => ({
    month_key: c.month_key,
    version: c.current_version,
  }));

  const { data: versions, error: verError } = await supabase
    .from('schedule_board_versions')
    .select('id, month_key, version, note, created_at, storage_path')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .in(
      'month_key',
      versionKeys.map((v) => v.month_key),
    );
  if (verError) throw verError;

  const latestByMonth = new Map<string, { id: string; version: number; note: string; created_at: string; storage_path: string }>();
  for (const row of versions ?? []) {
    const v = row as {
      id: string;
      month_key: string;
      version: number;
      note: string;
      created_at: string;
      storage_path: string;
    };
    const wanted = candidates.find((c) => c.month_key === v.month_key)?.current_version;
    if (wanted !== v.version) continue;
    latestByMonth.set(v.month_key, v);
  }

  const versionIds = [...latestByMonth.values()].map((v) => v.id);
  if (!versionIds.length) return [];

  const { data: reads, error: readError } = await supabase
    .from('schedule_board_reads')
    .select('version_id')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('staff_name', name)
    .in('version_id', versionIds);
  if (readError) throw readError;

  const readSet = new Set((reads ?? []).map((r) => String((r as { version_id: string }).version_id)));

  return candidates
    .map((c) => {
      const ver = latestByMonth.get(c.month_key);
      if (!ver || readSet.has(ver.id)) return null;
      return {
        monthKey: c.month_key,
        versionId: ver.id,
        version: ver.version,
        note: ver.note || c.note,
        updatedAt: c.updated_at,
        url: getScheduleBoardUrl(ver.storage_path || c.storage_path),
      } satisfies ScheduleConfirmAlert;
    })
    .filter((x): x is ScheduleConfirmAlert => Boolean(x));
}

const PINNED_MONTH_KEY = `schedule-board-pinned-month:${DEFAULT_HOTEL_ID}`;

export function getPinnedScheduleMonth(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = localStorage.getItem(PINNED_MONTH_KEY)?.trim() ?? '';
    return isValidMonthKey(value) ? value : null;
  } catch {
    return null;
  }
}

export function setPinnedScheduleMonth(monthKey: string | null): void {
  if (typeof window === 'undefined') return;
  if (!monthKey) {
    localStorage.removeItem(PINNED_MONTH_KEY);
  } else if (isValidMonthKey(monthKey)) {
    localStorage.setItem(PINNED_MONTH_KEY, monthKey.trim());
  }
  window.dispatchEvent(new Event('schedule-board-pin-change'));
}

export async function downloadScheduleImage(url: string, filename: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('이미지를 내려받지 못했습니다.');
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename || 'schedule.png';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export function printScheduleImage(
  url: string,
  options: { title: string; version: number | string },
): void {
  const safeTitle = String(options.title).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const safeVersion = String(options.version).replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const printedAt = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
  }).format(new Date());
  const safePrintedAt = printedAt.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    throw new Error('인쇄 준비에 실패했습니다.');
  }

  let cleaned = false;
  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    setTimeout(() => iframe.remove(), 1000);
  }

  doc.open();
  doc.write(`<!doctype html><html><head><title>${safeTitle} v${safeVersion}</title>
<style>
  @page {
    size: A4 landscape;
    margin: 4mm;
  }
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    background: #fff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
  }
  .print-meta {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    flex: 0 0 auto;
    padding: 0 0 2.5mm;
    border-bottom: 0.35mm solid #cbd5e1;
    margin-bottom: 2.5mm;
    font-family: "Pretendard", "Noto Sans KR", "Apple SD Gothic Neo", sans-serif;
    color: #0f172a;
  }
  .print-meta__title {
    font-size: 11pt;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  .print-meta__info {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.85rem;
    font-size: 9pt;
    font-weight: 600;
    color: #334155;
  }
  .print-meta__info span {
    white-space: nowrap;
  }
  .print-frame {
    flex: 1 1 auto;
    min-height: 0;
    position: relative;
  }
  .print-frame img {
    display: block;
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    object-fit: contain;
    object-position: center top;
  }
</style></head><body>
<header class="print-meta">
  <div class="print-meta__title">${safeTitle}</div>
  <div class="print-meta__info">
    <span>버전 ${safeVersion}</span>
    <span>인쇄 ${safePrintedAt}</span>
  </div>
</header>
<div class="print-frame">
  <img src="${url}" alt="${safeTitle} v${safeVersion}" />
</div>
</body></html>`);
  doc.close();

  const win = iframe.contentWindow;
  if (!win) {
    iframe.remove();
    throw new Error('인쇄 준비에 실패했습니다.');
  }

  const img = doc.querySelector('img');
  function runPrint() {
    try {
      win!.focus();
      win!.print();
    } finally {
      cleanup();
    }
  }
  if (img && !img.complete) {
    img.addEventListener('load', runPrint, { once: true });
    img.addEventListener('error', () => cleanup(), { once: true });
    setTimeout(runPrint, 2500);
  } else {
    setTimeout(runPrint, 150);
  }
  win.addEventListener('afterprint', cleanup);
}

export async function fetchScheduleBoardImage(
  monthKey: string,
): Promise<ScheduleBoardImage | null> {
  if (!isValidMonthKey(monthKey)) throw new Error('올바른 연·월을 선택해 주세요.');
  const supabase = createClient();
  const { data, error } = await supabase
    .from('schedule_board_images')
    .select(IMAGE_SELECT)
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('month_key', monthKey.trim())
    .maybeSingle();
  if (error) throw error;
  if (!data?.storage_path) return null;
  return withUrl(data as Omit<ScheduleBoardImage, 'url'>);
}

export async function listScheduleBoardVersions(
  monthKey: string,
): Promise<ScheduleBoardVersion[]> {
  if (!isValidMonthKey(monthKey)) throw new Error('올바른 연·월을 선택해 주세요.');
  const supabase = createClient();
  const { data, error } = await supabase
    .from('schedule_board_versions')
    .select(VERSION_SELECT)
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('month_key', monthKey.trim())
    .order('version', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => withUrl(row as Omit<ScheduleBoardVersion, 'url'>));
}

export async function fetchScheduleBoardReads(
  versionIds: string[],
): Promise<ScheduleBoardRead[]> {
  if (!versionIds.length) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('schedule_board_reads')
    .select('version_id, staff_name, shift, read_at')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .in('version_id', versionIds);
  if (error) throw error;
  return (data ?? []) as ScheduleBoardRead[];
}

export async function listActiveStaff(): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('staff')
    .select('name')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('is_active', true)
    .order('sort_order')
    .order('name');
  if (error) throw error;
  return (data ?? []).map((row) => String((row as { name: string }).name));
}

export async function markScheduleBoardRead(input: {
  versionId: string;
  monthKey: string;
  staffName: string;
  shift?: string;
}): Promise<void> {
  const staffName = input.staffName.trim();
  if (!staffName) throw new Error('확인할 담당자를 먼저 선택해 주세요.');
  const supabase = createClient();
  const { error } = await supabase.from('schedule_board_reads').upsert(
    {
      hotel_id: DEFAULT_HOTEL_ID,
      version_id: input.versionId,
      month_key: input.monthKey.trim(),
      staff_name: staffName,
      shift: input.shift?.trim() ?? '',
      read_at: new Date().toISOString(),
    },
    { onConflict: 'version_id,staff_name' },
  );
  if (error) throw error;
}

export async function listScheduleBoardMonths(): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('schedule_board_images')
    .select('month_key')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .order('month_key', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => String((row as { month_key: string }).month_key));
}

export async function uploadScheduleBoardImage(
  monthKey: string,
  file: File,
  options?: { note?: string; uploaderLabel?: string },
): Promise<ScheduleBoardImage> {
  if (!isValidMonthKey(monthKey)) throw new Error('올바른 연·월을 선택해 주세요.');
  if (!file.type.startsWith('image/')) {
    throw new Error('이미지 파일만 올릴 수 있습니다.');
  }
  if (file.size > MAX_BYTES) {
    throw new Error('이미지는 8MB 이하만 올릴 수 있습니다.');
  }

  const supabase = createClient();
  const user = await assertLoggedInUser(supabase);

  const month = monthKey.trim();
  const note = options?.note?.trim() ?? '';
  const uploaderLabel = options?.uploaderLabel?.trim() ?? '';

  const { data: latest, error: latestError } = await supabase
    .from('schedule_board_versions')
    .select('version')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('month_key', month)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) throw latestError;
  const nextVersion = ((latest as { version: number } | null)?.version ?? 0) + 1;

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const storagePath = `${DEFAULT_HOTEL_ID}/${month}/board-v${nextVersion}-${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const nowIso = new Date().toISOString();

  const { error: versionError } = await supabase.from('schedule_board_versions').insert({
    hotel_id: DEFAULT_HOTEL_ID,
    month_key: month,
    version: nextVersion,
    storage_path: storagePath,
    filename: file.name,
    note,
    created_at: nowIso,
    created_by: user.id,
    created_by_label: uploaderLabel,
  });
  if (versionError) {
    await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => undefined);
    throw versionError;
  }

  const { data, error } = await supabase
    .from('schedule_board_images')
    .upsert(
      {
        hotel_id: DEFAULT_HOTEL_ID,
        month_key: month,
        storage_path: storagePath,
        filename: file.name,
        note,
        current_version: nextVersion,
        updated_at: nowIso,
        updated_by: user.id,
        updated_by_label: uploaderLabel,
      },
      { onConflict: 'hotel_id,month_key' },
    )
    .select(IMAGE_SELECT)
    .single();

  if (error) throw error;

  return withUrl(data as Omit<ScheduleBoardImage, 'url'>);
}

/**
 * 개별 버전 하나만 삭제합니다 (매니저 전용).
 * 삭제한 버전이 현재 버전이면 남은 버전 중 최신으로 포인터를 되돌리고,
 * 남은 버전이 없으면 이 달 이미지 레코드도 지웁니다.
 */
export async function deleteScheduleBoardVersion(
  monthKey: string,
  versionId: string,
): Promise<void> {
  if (!isValidMonthKey(monthKey)) throw new Error('올바른 연·월을 선택해 주세요.');
  const month = monthKey.trim();
  const supabase = createClient();
  await assertScheduleManager(supabase);

  const { data: target, error: targetError } = await supabase
    .from('schedule_board_versions')
    .select('id, storage_path')
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('id', versionId)
    .maybeSingle();
  if (targetError) throw targetError;
  if (!target) throw new Error('이미 삭제된 버전입니다.');

  const { error: deleteError } = await supabase
    .from('schedule_board_versions')
    .delete()
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('id', versionId);
  if (deleteError) throw deleteError;

  const storagePath = String((target as { storage_path: string }).storage_path ?? '');
  if (storagePath) {
    await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => undefined);
  }

  // 남은 버전 중 최신을 현재 이미지로 유지한다
  const { data: latest, error: latestError } = await supabase
    .from('schedule_board_versions')
    .select(VERSION_SELECT)
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('month_key', month)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) throw latestError;

  if (!latest) {
    const { error: imgError } = await supabase
      .from('schedule_board_images')
      .delete()
      .eq('hotel_id', DEFAULT_HOTEL_ID)
      .eq('month_key', month);
    if (imgError) throw imgError;
    return;
  }

  const latestRow = latest as Omit<ScheduleBoardVersion, 'url'>;
  const { error: imgError } = await supabase
    .from('schedule_board_images')
    .update({
      storage_path: latestRow.storage_path,
      filename: latestRow.filename,
      note: latestRow.note,
      current_version: latestRow.version,
      updated_at: latestRow.created_at,
      updated_by: latestRow.created_by,
      updated_by_label: latestRow.created_by_label,
    })
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('month_key', month);
  if (imgError) throw imgError;
}

export async function clearScheduleBoardImage(monthKey: string): Promise<void> {
  if (!isValidMonthKey(monthKey)) throw new Error('올바른 연·월을 선택해 주세요.');
  const month = monthKey.trim();
  const supabase = createClient();
  await assertScheduleManager(supabase);

  const versions = await listScheduleBoardVersions(month);
  const paths = versions.map((v) => v.storage_path);
  if (paths.length) {
    await supabase.storage.from(BUCKET).remove(paths).catch(() => undefined);
  }

  // reads/versions는 FK cascade 이지만, 이미지 포인터 먼저 정리
  const { error: imgError } = await supabase
    .from('schedule_board_images')
    .delete()
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('month_key', month);
  if (imgError) throw imgError;

  const { error: verError } = await supabase
    .from('schedule_board_versions')
    .delete()
    .eq('hotel_id', DEFAULT_HOTEL_ID)
    .eq('month_key', month);
  if (verError) throw verError;
}
