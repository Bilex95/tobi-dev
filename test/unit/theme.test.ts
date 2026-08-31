import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveInitialTheme, nextTheme, THEME_KEY } from '../../src/lib/theme.ts';

test('THEME_KEY is stable', () => assert.equal(THEME_KEY, 'tobi-theme'));

test('stored value wins over system preference', () => {
  assert.equal(resolveInitialTheme('light', true), 'light');
  assert.equal(resolveInitialTheme('dark', false), 'dark');
});

test('no stored value: dark is default, but light system pref is honoured', () => {
  assert.equal(resolveInitialTheme(null, true), 'dark');
  assert.equal(resolveInitialTheme(null, false), 'light');
});

test('invalid stored value is ignored', () => {
  assert.equal(resolveInitialTheme('banana', true), 'dark');
});

test('nextTheme flips', () => {
  assert.equal(nextTheme('light'), 'dark');
  assert.equal(nextTheme('dark'), 'light');
});
