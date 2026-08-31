import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const DIR = 'src/content/caseStudies';
const REQUIRED = ['title', 'slug', 'role', 'timeframe', 'stack', 'repo', 'summary', 'order'];

test('every case study has all required frontmatter keys', async () => {
  const files = (await readdir(DIR)).filter((f) => f.endsWith('.mdx'));
  assert.ok(files.length >= 2);
  for (const f of files) {
    const src = await readFile(`${DIR}/${f}`, 'utf8');
    const fm = src.split('---')[1] ?? '';
    for (const key of REQUIRED) {
      assert.match(fm, new RegExp(`^${key}:`, 'm'), `${f} missing ${key}`);
    }
  }
});

test('case study order values are unique and assertkit is order 1', async () => {
  const files = (await readdir(DIR)).filter((f) => f.endsWith('.mdx'));
  const orders = new Map<string, number>();
  for (const f of files) {
    const fm = (await readFile(`${DIR}/${f}`, 'utf8')).split('---')[1];
    orders.set(f, Number(fm.match(/^order:\s*(\d+)/m)![1]));
  }
  assert.equal(new Set(orders.values()).size, orders.size, 'orders must be unique');
  assert.equal(orders.get('assertkit.mdx'), 1);
});
