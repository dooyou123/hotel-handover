/** 마이그레이션 032 미적용 시 Supabase가 반환하는 오류 */
export function isLeaveSchemaMissing(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.code === '42703' || error.code === '42P01' || error.code === 'PGRST205') return true;
  return /does not exist/i.test(error.message ?? '');
}
