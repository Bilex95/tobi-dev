import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasCv } from '../../src/lib/cv.ts';

test('hasCv is true only when the CV file exists', () => {
  assert.equal(hasCv(true), true);
  assert.equal(hasCv(false), false);
});
