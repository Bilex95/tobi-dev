export const THEME_KEY = 'tobi-theme';
export type Theme = 'light' | 'dark';

/**
 * Resolve the theme to apply on first paint.
 *
 * Dark is the default. The OS `prefers-color-scheme` is deliberately NOT
 * consulted: browsers dropped the `no-preference` tri-state, so honouring the
 * OS would defeat "dark by default". A persisted 'light' | 'dark' choice wins;
 * anything else resolves to 'dark'.
 */
export function resolveInitialTheme(stored: string | null): Theme {
  return stored === 'light' || stored === 'dark' ? stored : 'dark';
}

export function nextTheme(current: Theme): Theme {
  return current === 'dark' ? 'light' : 'dark';
}
