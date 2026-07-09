export type OtaAccount = {
  id: string;
  site: string;
  loginId: string;
  password: string;
  extra: string;
  url: string;
};

export type OtaAccountColumnMapping = {
  site: string;
  login: string;
  password: string;
  extra: string;
  url: string;
};

export const DEFAULT_OTA_ACCOUNT_COLUMNS: OtaAccountColumnMapping = {
  site: '여행사명',
  login: 'ID',
  password: 'PW',
  extra: '기타',
  url: 'URL',
};

export type OtaAccountsSheetSettings = {
  sheetUrl: string;
  columns: OtaAccountColumnMapping;
};

export type OtaAccountsPayload = {
  accounts: OtaAccount[];
  fetchedAt: string;
  source: 'sheet_csv';
  columns: OtaAccountColumnMapping;
  sheetUrl: string;
};
