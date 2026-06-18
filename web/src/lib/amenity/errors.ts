import type { PostgrestError } from '@supabase/supabase-js';

export function parseAmenityError(error: PostgrestError | Error): string {
  const message = error.message ?? '';

  if (message.includes('재고가 부족')) {
    return message.replace(/^.*?(?=재고가)/, '');
  }
  if (message.includes('어메니티를 찾을 수 없습니다')) {
    return '어메니티를 선택해 주세요.';
  }
  if (message.includes('거래 내역을 찾을 수 없습니다')) {
    return '거래 내역을 찾을 수 없습니다.';
  }
  if (message.includes('권한이 없습니다')) {
    return '접근 권한이 없습니다. 다시 로그인해 주세요.';
  }

  if (message.includes('시스템 재고와 실사 수량이 같습니다')) {
    return '시스템 재고와 실사 수량이 같습니다.';
  }
  if (message.includes('실사 수량은 0 이상')) {
    return '실사 수량은 0 이상이어야 합니다.';
  }

  return message || '저장에 실패했습니다.';
}
