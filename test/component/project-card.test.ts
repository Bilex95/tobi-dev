import { test } from 'node:test';
import assert from 'node:assert/strict';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import ProjectCard from '../../src/components/ProjectCard.astro';

const base = {
  slug: 'assertkit', name: 'assertkit', description: 'desc',
  url: 'https://github.com/Bilex95/assertkit', homepage: null,
  topics: ['portfolio', 'qa'], language: 'JavaScript', stars: 3,
  pushedAt: '2026-08-31T00:00:00Z', featured: true,
};

test('renders name, link, and blurb when present', async () => {
  const c = await AstroContainer.create();
  const html = await c.renderToString(ProjectCard, { props: { project: { ...base, blurb: 'B' } } });
  assert.match(html, /assertkit/);
  assert.match(html, /href="https:\/\/github\.com\/Bilex95\/assertkit"/);
  assert.match(html, /B/);
});

test('falls back to description when no blurb, and omits thumbnail img when absent', async () => {
  const c = await AstroContainer.create();
  const html = await c.renderToString(ProjectCard, { props: { project: base } });
  assert.match(html, /desc/);
  assert.doesNotMatch(html, /<img/);
});
