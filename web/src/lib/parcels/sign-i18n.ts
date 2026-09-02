export const PARCEL_SIGN_LOCALES = ['ko', 'en', 'ja', 'zh'] as const;
export type ParcelSignLocale = (typeof PARCEL_SIGN_LOCALES)[number];

export const PARCEL_SIGN_LOCALE_LABELS: Record<ParcelSignLocale, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '中文',
};

export type ParcelSignMessages = {
  loading: string;
  errorTitle: string;
  errorHelp: string;
  linkUnavailable: string;
  loadParcelFailed: string;
  networkError: string;
  doneTitle: string;
  doneBody: string;
  eyebrow: string;
  roomUnassigned: string;
  checkout: string;
  checkin: string;
  reservation: string;
  storage: string;
  description: string;
  recipientLabel: string;
  recipientPlaceholder: string;
  signatureLabel: string;
  submit: string;
  submitting: string;
  legal: string;
  errRecipientRequired: string;
  errSignatureRequired: string;
  errSubmitFailed: string;
  signatureHint: string;
  signatureClear: string;
  signatureAria: string;
  langSwitch: string;
};

const MESSAGES: Record<ParcelSignLocale, ParcelSignMessages> = {
  ko: {
    loading: '불러오는 중…',
    errorTitle: '링크를 사용할 수 없습니다',
    errorHelp: '프런트 데스크에 새 전달 링크를 요청해 주세요.',
    linkUnavailable: '링크를 사용할 수 없습니다.',
    loadParcelFailed: '물건 정보를 불러오지 못했습니다.',
    networkError: '네트워크 오류가 발생했습니다.',
    doneTitle: '전달이 완료되었습니다',
    doneBody: '감사합니다. 이 화면을 닫아 주세요.',
    eyebrow: '물건 전달 확인',
    roomUnassigned: '객실 미지정',
    checkout: '체크아웃',
    checkin: '체크인',
    reservation: '예약번호',
    storage: '보관 위치',
    description: '내용',
    recipientLabel: '수령자 성명',
    recipientPlaceholder: '성명',
    signatureLabel: '서명',
    submit: '전달 확인',
    submitting: '처리 중…',
    legal: '서명은 물건 수령 확인용으로만 사용됩니다.',
    errRecipientRequired: '수령자 성명을 입력해 주세요.',
    errSignatureRequired: '서명을 입력해 주세요.',
    errSubmitFailed: '전달 처리에 실패했습니다.',
    signatureHint: '여기에 서명해 주세요',
    signatureClear: '지우기',
    signatureAria: '서명',
    langSwitch: '언어',
  },
  en: {
    loading: 'Loading…',
    errorTitle: 'This link is unavailable',
    errorHelp: 'Please ask the front desk for a new delivery confirmation link.',
    linkUnavailable: 'This link is unavailable.',
    loadParcelFailed: 'Could not load parcel information.',
    networkError: 'A network error occurred.',
    doneTitle: 'Delivery confirmed',
    doneBody: 'Thank you. You may close this screen.',
    eyebrow: 'Item pick-up confirmation',
    roomUnassigned: 'Room not specified',
    checkout: 'Check-out',
    checkin: 'Check-in',
    reservation: 'Reservation',
    storage: 'Storage location',
    description: 'Contents',
    recipientLabel: 'Recipient name',
    recipientPlaceholder: 'Full name',
    signatureLabel: 'Signature',
    submit: 'Confirm pick-up',
    submitting: 'Processing…',
    legal: 'Your signature is used only to confirm item receipt.',
    errRecipientRequired: 'Please enter the recipient name.',
    errSignatureRequired: 'Please sign in the box.',
    errSubmitFailed: 'Could not complete pick-up confirmation.',
    signatureHint: 'Sign here',
    signatureClear: 'Clear',
    signatureAria: 'Signature',
    langSwitch: 'Language',
  },
  ja: {
    loading: '読み込み中…',
    errorTitle: 'リンクを使用できません',
    errorHelp: 'フロントデスクに新しい受取リンクを依頼してください。',
    linkUnavailable: 'リンクを使用できません。',
    loadParcelFailed: '荷物情報を読み込めませんでした。',
    networkError: 'ネットワークエラーが発生しました。',
    doneTitle: '受取が完了しました',
    doneBody: 'ありがとうございます。この画面を閉じてください。',
    eyebrow: '物品お渡し確認',
    roomUnassigned: '部屋番号なし',
    checkout: 'チェックアウト',
    checkin: 'チェックイン',
    reservation: '予約番号',
    storage: '保管場所',
    description: '内容',
    recipientLabel: '受取人氏名',
    recipientPlaceholder: '氏名',
    signatureLabel: '署名',
    submit: '受取確認',
    submitting: '処理中…',
    legal: '署名は荷物受取の確認のみに使用されます。',
    errRecipientRequired: '受取人氏名を入力してください。',
    errSignatureRequired: '署名を入力してください。',
    errSubmitFailed: '受取処理に失敗しました。',
    signatureHint: 'ここに署名してください',
    signatureClear: '消去',
    signatureAria: '署名',
    langSwitch: '言語',
  },
  zh: {
    loading: '加载中…',
    errorTitle: '无法使用此链接',
    errorHelp: '请向前台索取新的领取确认链接。',
    linkUnavailable: '无法使用此链接。',
    loadParcelFailed: '无法加载包裹信息。',
    networkError: '发生网络错误。',
    doneTitle: '领取已完成',
    doneBody: '谢谢。您可以关闭此页面。',
    eyebrow: '物品领取确认',
    roomUnassigned: '未指定房间',
    checkout: '退房日期',
    checkin: '入住日期',
    reservation: '预订号',
    storage: '存放位置',
    description: '内容',
    recipientLabel: '领取人姓名',
    recipientPlaceholder: '姓名',
    signatureLabel: '签名',
    submit: '确认领取',
    submitting: '处理中…',
    legal: '签名仅用于确认包裹领取。',
    errRecipientRequired: '请输入领取人姓名。',
    errSignatureRequired: '请签名。',
    errSubmitFailed: '领取确认失败。',
    signatureHint: '请在此签名',
    signatureClear: '清除',
    signatureAria: '签名',
    langSwitch: '语言',
  },
};

const API_ERROR_I18N: Record<string, Partial<Record<ParcelSignLocale, string>>> = {
  '만료되었거나 이미 사용된 링크입니다.': {
    en: 'This link has expired or has already been used.',
    ja: 'リンクの有効期限が切れているか、すでに使用されています。',
    zh: '链接已过期或已被使用。',
  },
  '수령자 성명을 입력해 주세요.': {
    en: 'Please enter the recipient name.',
    ja: '受取人氏名を入力してください。',
    zh: '请输入领取人姓名。',
  },
  '서명이 필요합니다.': {
    en: 'A signature is required.',
    ja: '署名が必要です。',
    zh: '需要签名。',
  },
  '전달 처리에 실패했습니다.': {
    en: 'Could not complete pick-up confirmation.',
    ja: '受取処理に失敗しました。',
    zh: '领取确认失败。',
  },
  '서버에 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.': {
    en: 'Service is temporarily unavailable. Please contact the front desk.',
    ja: 'サービスを一時的に利用できません。フロントにお問い合わせください。',
    zh: '服务暂时不可用，请联系前台。',
  },
};

export function parcelSignMessages(locale: ParcelSignLocale): ParcelSignMessages {
  return MESSAGES[locale];
}

export function parseParcelSignLocale(value: string | null | undefined): ParcelSignLocale | null {
  if (value === 'ko' || value === 'en' || value === 'ja' || value === 'zh') return value;
  return null;
}

export function detectParcelSignLocale(): ParcelSignLocale {
  if (typeof navigator === 'undefined') return 'ko';
  const lang = navigator.language.toLowerCase();
  if (lang.startsWith('ja')) return 'ja';
  if (lang.startsWith('zh')) return 'zh';
  if (lang.startsWith('en')) return 'en';
  return 'ko';
}

import type { ParcelSignPreview } from '@/lib/parcels/types';

export function formatParcelSignTitle(
  preview: Pick<ParcelSignPreview, 'room_number' | 'reservation_number'>,
  locale: ParcelSignLocale,
): string {
  const t = MESSAGES[locale];
  if (preview.room_number.trim()) return formatParcelSignRoom(preview.room_number, locale);
  if (preview.reservation_number.trim()) {
    switch (locale) {
      case 'en':
        return `${t.reservation} ${preview.reservation_number}`;
      case 'ja':
        return `${t.reservation} ${preview.reservation_number}`;
      case 'zh':
        return `${t.reservation} ${preview.reservation_number}`;
      default:
        return `${t.reservation} ${preview.reservation_number}`;
    }
  }
  return t.roomUnassigned;
}

export function formatParcelSignRoom(room: string, locale: ParcelSignLocale): string {
  const t = MESSAGES[locale];
  if (!room.trim()) return t.roomUnassigned;
  switch (locale) {
    case 'en':
      return `Room ${room}`;
    case 'ja':
      return `${room}号室`;
    case 'zh':
      return `${room}号房`;
    default:
      return `${room}호`;
  }
}

export function translateParcelSignApiError(message: string, locale: ParcelSignLocale): string {
  if (locale === 'ko') return message;
  return API_ERROR_I18N[message]?.[locale] ?? message;
}
