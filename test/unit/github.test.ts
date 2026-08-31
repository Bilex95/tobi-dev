import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRepo, applyOverrides, filterPortfolio, loadProjects } from '../../src/lib/github.ts';

const raw = (over = {}) => ({
  name: 'assertkit', description: 'x', html_url: 'https://github.com/Bilex95/assertkit',
  homepage: '', topics: ['portfolio', 'qa'], language: 'JavaScript',
  stargazers_count: 3, pushed_at: '2026-08-31T00:00:00Z', fork: false, private: false, ...over,
});

test('normalizeRepo maps REST fields and defaults', () => {
  const p = normalizeRepo(raw());
  assert.equal(p.slug, 'assertkit');
  assert.equal(p.url, 'https://github.com/Bilex95/assertkit');
  assert.equal(p.homepage, null);        // '' -> null
  assert.equal(p.stars, 3);
  assert.equal(p.featured, false);
});

test('filterPortfolio keeps only repos with the portfolio topic', () => {
  const kept = filterPortfolio([normalizeRepo(raw()), normalizeRepo(raw({ name: 'z', topics: ['misc'] }))]);
  assert.deepEqual(kept.map((p) => p.slug), ['assertkit']);
});

test('applyOverrides hides, orders featured first, and injects blurb', () => {
  const input = [
    normalizeRepo(raw({ name: 'craft-factory' })),
    normalizeRepo(raw({ name: 'assertkit' })),
    normalizeRepo(raw({ name: 'dead' })),
  ];
  const out = applyOverrides(input, {
    featured: ['assertkit', 'craft-factory'], hide: ['dead'],
    entries: { assertkit: { blurb: 'B' } },
  });
  assert.deepEqual(out.map((p) => p.slug), ['assertkit', 'craft-factory']);
  assert.equal(out[0].featured, true);
  assert.equal(out[0].blurb, 'B');
});

test('loadProjects falls back to cache on fetch failure', async () => {
  const fetchImpl = async () => { throw new Error('network down'); };
  const projects = await loadProjects({
    fetchImpl: fetchImpl as unknown as typeof fetch,
    cachePath: 'test/fixtures/cache.sample.json',
    overridesPath: 'src/content/projects/_overrides.json',
  });
  assert.ok(Array.isArray(projects));
  assert.equal(projects[0].slug, 'assertkit');
});

test('loadProjects falls back to cache on non-OK response', async () => {
  const fetchImpl = async () => new Response('nope', { status: 503 });
  const projects = await loadProjects({
    fetchImpl: fetchImpl as unknown as typeof fetch,
    cachePath: 'test/fixtures/cache.sample.json',
    overridesPath: 'src/content/projects/_overrides.json',
  });
  assert.equal(projects[0].slug, 'assertkit');
});

test('loadProjects falls back to cache when no repos carry the portfolio topic yet', async () => {
  const fetchImpl = async () => new Response('[]', { status: 200 });
  const projects = await loadProjects({
    fetchImpl: fetchImpl as unknown as typeof fetch,
    cachePath: 'test/fixtures/cache.sample.json',
    overridesPath: 'src/content/projects/_overrides.json',
  });
  assert.equal(projects[0].slug, 'assertkit');
});
