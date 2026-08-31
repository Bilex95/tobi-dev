import { test } from 'node:test';
import assert from 'node:assert/strict';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import TagFilter from '../../src/components/TagFilter.astro';

test('renders an "All" button plus one button per tag', async () => {
  const c = await AstroContainer.create();
  const html = await c.renderToString(TagFilter, { props: { tags: ['qa', 'ai'] } });
  const buttons = html.match(/<button\b/g) ?? [];
  assert.equal(buttons.length, 3);
  assert.match(html, /data-tag="qa"/);
  assert.match(html, /data-tag="ai"/);
  assert.match(html, />\s*All\s*</);
});

test('every button is a keyboard-focusable type="button"', async () => {
  const c = await AstroContainer.create();
  const html = await c.renderToString(TagFilter, { props: { tags: ['qa', 'ai'] } });
  const types = html.match(/type="button"/g) ?? [];
  assert.equal(types.length, 3);
});

test('the "All" button carries aria-pressed defaulting to true', async () => {
  const c = await AstroContainer.create();
  const html = await c.renderToString(TagFilter, { props: { tags: ['qa'] } });
  assert.match(html, /<button[^>]*data-tag="\*"[^>]*aria-pressed="true"/);
});

test('tag buttons default to aria-pressed false', async () => {
  const c = await AstroContainer.create();
  const html = await c.renderToString(TagFilter, { props: { tags: ['qa'] } });
  assert.match(html, /<button[^>]*data-tag="qa"[^>]*aria-pressed="false"/);
});
