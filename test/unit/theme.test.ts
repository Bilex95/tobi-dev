import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveInitialTheme, nextTheme, THEME_KEY } from '../../src/lib/theme.ts';

test('THEME_KEY is stable', () => assert.equal(THEME_KEY, 'tobi-theme'));

test('a persisted choice wins', () => {
  assert.equal(resolveInitialTheme('light'), 'light');
  assert.equal(resolveInitialTheme('dark'), 'dark');
});

test('no stored value: dark is the default (OS preference is not consulted)', () => {
  assert.equal(resolveInitialTheme(null), 'dark');
  // an absent / non-string value also resolves to dark
  assert.equal(resolveInitialTheme(undefined as any), 'dark');
});

test('invalid stored value is ignored', () => {
  assert.equal(resolveInitialTheme('banana'), 'dark');
});

test('nextTheme flips', () => {
  assert.equal(nextTheme('light'), 'dark');
  assert.equal(nextTheme('dark'), 'light');
});
