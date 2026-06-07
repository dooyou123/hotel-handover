import { expect, test } from '@playwright/test';

test.describe('인증·라우팅', () => {
  test('로그인 페이지가 표시된다', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: '프런트 인수인계 보드' })).toBeVisible();
    await expect(page.getByText('직원 이메일')).toBeVisible();
    await expect(page.getByText('비밀번호')).toBeVisible();
  });

  test('미로그인 시 handover 접근하면 login으로 리다이렉트', async ({ page }) => {
    await page.goto('/handover');
    await expect(page).toHaveURL(/\/login/);
  });

  test('미로그인 시 help 접근하면 login으로 리다이렉트', async ({ page }) => {
    await page.goto('/help');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('스테이징 UAT smoke (로그인 계정 필요)', () => {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD 환경 변수 필요');

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('name@hotel.com').fill(email!);
    await page.getByPlaceholder('관리자가 안내한 비밀번호').fill(password!);
    await page.getByRole('button', { name: '로그인' }).click();
    await expect(page).toHaveURL(/\/handover/, { timeout: 15_000 });
  });

  test('인수인계 — 일일 요약 버튼', async ({ page }) => {
    await expect(page.getByRole('button', { name: '일일 요약' })).toBeVisible();
  });

  test('도움말 페이지', async ({ page }) => {
    await page.getByRole('link', { name: '도움말' }).click();
    await expect(page).toHaveURL(/\/help/);
    await expect(page.getByRole('heading', { name: '프런트 인수인계 보드 — 사용 안내' })).toBeVisible();
  });

  test('탭 네비게이션', async ({ page }) => {
    await page.getByRole('link', { name: '연락처' }).click();
    await expect(page).toHaveURL(/\/contacts/);
    await page.getByRole('link', { name: '체크리스트' }).click();
    await expect(page).toHaveURL(/\/checklist/);
    await page.getByRole('link', { name: '스케줄' }).click();
    await expect(page).toHaveURL(/\/schedule/);
  });
});
