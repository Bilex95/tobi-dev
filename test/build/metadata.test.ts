import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { SITE } from '../../src/lib/seo.ts';

const SITE_RE = SITE.replace(/[.]/g, '\\.');

async function htmlFiles(dir: string, acc: string[] = []): Promise<string[]> {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await htmlFiles(p, acc);
    else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

test('every page has a unique non-empty <title>, a canonical link, and og:image', async () => {
  const files = await htmlFiles('dist');
  assert.ok(files.length > 0, 'no HTML emitted');
  const titles = new Map<string, string>();
  for (const f of files) {
    const html = await readFile(f, 'utf8');
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1]?.trim();
    assert.ok(title, `${f} has no <title>`);
    assert.ok(!titles.has(title), `duplicate title ${JSON.stringify(title)} in ${f} and ${titles.get(title)}`);
    titles.set(title, f);

    // The 404 page is intentionally noindex: no canonical, an explicit robots
    // meta instead. Every other page must still carry a canonical.
    if (f.replace(/\\/g, '/').endsWith('/404.html')) {
      assert.match(html, /<meta name="robots" content="noindex">/, `${f} missing noindex`);
      assert.doesNotMatch(html, /rel="canonical"/, `${f} should not emit canonical`);
    } else {
      assert.match(
        html,
        new RegExp(`<link rel="canonical" href="${SITE_RE}`),
        `${f} missing canonical`,
      );
    }
    assert.match(html, /property="og:image"/, `${f} missing og:image`);
  }
});

test('home page embeds valid Person JSON-LD', async () => {
  const html = await readFile('dist/index.html', 'utf8');
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(m, 'no JSON-LD block');
  const parsed = JSON.parse(m![1]);
  assert.equal(parsed['@type'], 'Person');
  assert.equal(parsed.url, SITE);
});

test('a blog post embeds Article JSON-LD with datePublished', async () => {
  const html = await readFile('dist/blog/building-a-portfolio-pipeline/index.html', 'utf8');
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(m, 'no JSON-LD block');
  const parsed = JSON.parse(m![1]);
  assert.equal(parsed['@type'], 'Article');
  assert.match(parsed.datePublished, /^\d{4}-\d{2}-\d{2}$/);
});

test('robots.txt and sitemap-index.xml exist', async () => {
  const robots = await readFile('dist/robots.txt', 'utf8');
  assert.match(robots, new RegExp(`Sitemap: ${SITE_RE}/sitemap-index\\.xml`));
  const idx = await readFile('dist/sitemap-index.xml', 'utf8');
  assert.match(idx, /sitemap/);
});

test('the default OG image is published', async () => {
  const buf = await readFile('dist/og/default.png');
  assert.ok(buf.length > 1000, 'og image looks empty');
});
