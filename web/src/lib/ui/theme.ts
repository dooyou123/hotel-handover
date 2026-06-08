export const UI_THEME_STORAGE_KEY = 'handover-ui-theme';

export const UI_THEMES = ['project'] as const;
export type UiTheme = (typeof UI_THEMES)[number];

export const DEFAULT_UI_THEME: UiTheme = 'project';

export function isUiTheme(value: string | null | undefined): value is UiTheme {
  return value === 'project';
}

export function normalizeStoredUiTheme(_value: string | null): UiTheme {
  return DEFAULT_UI_THEME;
}

export function readUiTheme(): UiTheme {
  return DEFAULT_UI_THEME;
}

export function applyUiTheme(theme: UiTheme = DEFAULT_UI_THEME) {
  document.documentElement.dataset.ui = theme;
}
