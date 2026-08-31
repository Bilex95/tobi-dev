import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, isoDate } from '../../src/lib/format.ts';

test('formatDate renders the en-US long form', () => {
  // Local construction keeps the assertion timezone-independent.
  assert.equal(formatDate(new Date(2026, 7, 31)), 'August 31, 2026');
  assert.equal(formatDate(new Date(2025, 0, 1)), 'January 1, 2025');
});

test('isoDate renders a YYYY-MM-DD slice', () => {
  assert.equal(isoDate(new Date('2026-08-31T12:00:00Z')), '2026-08-31');
  assert.equal(isoDate(new Date('2025-01-01T12:00:00Z')), '2025-01-01');
});
