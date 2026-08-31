import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const DIR = 'src/content/blog';
const REQUIRED = ['title', 'date', 'summary'];

test('blog has at least one non-draft .mdx post', async () => {
  const files = (await readdir(DIR)).filter((f) => f.endsWith('.mdx'));
  assert.ok(files.length >= 1, 'expected >= 1 .mdx post in src/content/blog');

  const nonDraft = [];
  for (const f of files) {
    const fm = (await readFile(`${DIR}/${f}`, 'utf8')).split('---')[1] ?? '';
    if (!/^draft:\s*true\s*$/m.test(fm)) nonDraft.push(f);
  }
  assert.ok(nonDraft.length >= 1, 'expected >= 1 non-draft .mdx post');
});

test('every blog post has title, date, summary and a parseable date', async () => {
  const files = (await readdir(DIR)).filter((f) => f.endsWith('.mdx'));
  for (const f of files) {
    const fm = (await readFile(`${DIR}/${f}`, 'utf8')).split('---')[1] ?? '';
    for (const key of REQUIRED) {
      assert.match(fm, new RegExp(`^${key}:`, 'm'), `${f} missing ${key}`);
    }
    const raw = fm.match(/^date:\s*(.+)$/m)![1].trim();
    assert.ok(!Number.isNaN(new Date(raw).getTime()), `${f} has an unparseable date: ${raw}`);
  }
});
