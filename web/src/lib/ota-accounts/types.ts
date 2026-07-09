export type OtaAccount = {
  id: string;
  site: string;
  loginId: string;
  password: string;
  note: string;
};

export type OtaAccountColumnMapping = {
  site: string;
  login: string;
  password: string;
};

export const DEFAULT_OTA_ACCOUNT_COLUMNS: OtaAccountColumnMapping = {
  site: 'OTA',
  login: 'ID',
  password: 'PW',
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
