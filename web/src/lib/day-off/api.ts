import type { DayOffDateInput, DayOffRequest, DayOffWindowPayload } from '@/lib/day-off/types';

async function parseJson<T>(res: Response): Promise<T> {
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error((json as { error?: string }).error || `요청 실패 (${res.status})`);
  }
  return json;
}

export async function fetchDayOffSession(): Promise<{ authenticated: boolean; hotelId?: string; expiresAt?: number }> {
  const res = await fetch('/api/day-off/session', { credentials: 'include' });
  return parseJson(res);
}

export async function loginDayOffSession(pin: string): Promise<{ ok: true }> {
  const res = await fetch('/api/day-off/session', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  return parseJson(res);
}

export async function logoutDayOffSession(): Promise<void> {
  await fetch('/api/day-off/session', { method: 'DELETE', credentials: 'include' });
}

export async function fetchDayOffWindow(monthKey: string): Promise<DayOffWindowPayload> {
  const res = await fetch(`/api/day-off/window?month=${encodeURIComponent(monthKey)}`, {
    credentials: 'include',
  });
  return parseJson(res);
}

export async function dayOffRequestAction<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/day-off/requests', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export type DayOffStatusResponse = {
  hasRequests: boolean;
  hasPin: boolean;
  protected: boolean;
};

export type DayOffUnlockResponse = {
  unlocked: true;
  legacy?: boolean;
  message?: string;
  requests: DayOffRequest[];
};

export async function dayOffStatus(name: string, monthKey: string) {
  return dayOffRequestAction<DayOffStatusResponse>({
    action: 'status',
    employee_name: name,
    month_key: monthKey,
  });
}

export async function dayOffUnlock(name: string, pin: string, monthKey: string) {
  return dayOffRequestAction<DayOffUnlockResponse>({
    action: 'unlock',
    employee_name: name,
    pin,
    month_key: monthKey,
  });
}

export async function dayOffSave(input: {
  name: string;
  pin: string;
  pinConfirm?: string;
  newPin?: string;
  monthKey: string;
  dates: DayOffDateInput[];
}) {
  return dayOffRequestAction<{ ok: true; requests: DayOffRequest[] }>({
    action: 'save',
    employee_name: input.name,
    pin: input.pin,
    pin_confirm: input.pinConfirm,
    new_pin: input.newPin,
    month_key: input.monthKey,
    dates: input.dates,
  });
}

export async function dayOffClear(input: {
  name: string;
  pin: string;
  monthKey: string;
  date?: string;
}) {
  return dayOffRequestAction<{ ok: true }>({
    action: 'clear',
    employee_name: input.name,
    pin: input.pin,
    month_key: input.monthKey,
    date: input.date,
  });
}

export async function dayOffAdminAction<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch('/api/day-off/admin', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseJson(res);
}

export async function fetchDayOffAdmin(monthKey: string) {
  const res = await fetch(`/api/day-off/admin?month=${encodeURIComponent(monthKey)}`, {
    credentials: 'include',
  });
  return parseJson<{
    passwordConfigured: boolean;
    passwordUpdatedAt: string | null;
    window: DayOffWindowPayload['window'];
    blockedDates: DayOffWindowPayload['blockedDates'];
    requests: DayOffRequest[];
    dayCounts: DayOffWindowPayload['dayCounts'];
    staffNames: string[];
  }>(res);
}
