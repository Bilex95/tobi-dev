import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMeta, personJsonLd, articleJsonLd, SITE } from '../../src/lib/seo.ts';

test('buildMeta produces canonical, OG, and Twitter tags', () => {
  const m = buildMeta({ title: 'Work', description: 'd', path: '/work' });
  assert.equal(m.canonical, `${SITE}/work`);
  assert.ok(m.tags.some((t) => t.property === 'og:title' && t.content === 'Work'));
  assert.ok(m.tags.some((t) => t.name === 'twitter:card' && t.content === 'summary_large_image'));
  assert.ok(m.tags.some((t) => t.property === 'og:image'));
});

test('buildMeta normalises the root path to a single trailing slash', () => {
  assert.equal(buildMeta({ title: 'Home', description: 'd', path: '/' }).canonical, `${SITE}/`);
});

test('buildMeta strips a trailing slash so there are no canonical dupes', () => {
  assert.equal(
    buildMeta({ title: 'Blog', description: 'd', path: '/blog/' }).canonical,
    `${SITE}/blog`,
  );
});

test('buildMeta defaults og:image to the static default asset', () => {
  const m = buildMeta({ title: 'X', description: 'd', path: '/x' });
  assert.ok(
    m.tags.some((t) => t.property === 'og:image' && t.content === `${SITE}/og/default.png`),
  );
});

test('buildMeta honours an explicit image', () => {
  const m = buildMeta({ title: 'X', description: 'd', path: '/x', image: `${SITE}/og/custom.png` });
  assert.ok(
    m.tags.some((t) => t.property === 'og:image' && t.content === `${SITE}/og/custom.png`),
  );
});

test('buildMeta carries every required og + twitter tag', () => {
  const m = buildMeta({ title: 'T', description: 'D', path: '/p' });
  const props = m.tags.filter((t) => t.property).map((t) => t.property);
  for (const p of ['og:type', 'og:url', 'og:title', 'og:description', 'og:image']) {
    assert.ok(props.includes(p), `missing ${p}`);
  }
  const names = m.tags.filter((t) => t.name).map((t) => t.name);
  for (const n of ['twitter:card', 'twitter:title', 'twitter:description']) {
    assert.ok(names.includes(n), `missing ${n}`);
  }
  assert.ok(m.tags.some((t) => t.property === 'og:url' && t.content === m.canonical));
});

test('personJsonLd is a valid Person node', () => {
  const p = personJsonLd();
  assert.equal(p['@type'], 'Person');
  assert.equal(p.url, SITE);
  assert.ok(p.name);
  assert.ok(p.jobTitle);
  assert.ok(Array.isArray(p.sameAs) && p.sameAs.length >= 2);
  assert.ok(p.sameAs.some((u) => u.includes('github.com')));
  assert.ok(p.sameAs.some((u) => u.includes('linkedin.com')));
});

test('articleJsonLd carries headline and mainEntityOfPage', () => {
  const a = articleJsonLd({ headline: 'H', description: 'd', path: '/blog/x' });
  assert.equal(a['@type'], 'Article');
  assert.equal(a.mainEntityOfPage, `${SITE}/blog/x`);
  assert.equal(a.headline, 'H');
  assert.equal(a.author['@type'], 'Person');
});

test('articleJsonLd includes datePublished only when supplied', () => {
  const withDate = articleJsonLd({
    headline: 'H',
    description: 'd',
    path: '/blog/x',
    datePublished: '2026-08-31',
  });
  assert.equal(withDate.datePublished, '2026-08-31');
  assert.equal('datePublished' in articleJsonLd({ headline: 'H', description: 'd', path: '/c' }), false);
});
