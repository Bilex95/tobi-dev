#!/usr/bin/env node
/**
 * Link check with a floor.
 *
 * `linkinator ./dist` on its own exits 0 when it finds *nothing* — a crawl that
 * silently scans 0 links looks identical to a clean run, so a broken build
 * output or a bad root path would pass the gate. This wrapper fails when the
 * crawl scans fewer than MIN_LINKS, as well as on any broken link.
 *
 * Config (recurse + the `^https?://(?!127\.0\.0\.1)` external skip) still comes
 * from linkinator.config.json, which the API reads the same way the CLI does.
 */
import { readFile } from 'node:fs/promises';
import { LinkChecker } from 'linkinator';

const ROOT = process.argv[2] ?? './dist';

// The built site links far more than this; the floor only has to be high enough
// that an empty or near-empty crawl can never be mistaken for a clean one.
const MIN_LINKS = 10;

const config = JSON.parse(await readFile(new URL('../linkinator.config.json', import.meta.url), 'utf8'));

const checker = new LinkChecker();
const result = await checker.check({
  path: ROOT,
  recurse: config.recurse ?? true,
  linksToSkip: config.skip ? [config.skip] : [],
});

const scanned = result.links.filter((l) => l.state !== 'SKIPPED');
const broken = result.links.filter((l) => l.state === 'BROKEN');

if (broken.length > 0) {
  console.error(`${broken.length} broken link(s):`);
  for (const l of broken) {
    console.error(`  ${l.status ?? '???'}  ${l.url}\n      linked from ${l.parent}`);
  }
  process.exit(1);
}

if (scanned.length < MIN_LINKS) {
  console.error(
    `link check scanned only ${scanned.length} link(s) under ${ROOT} — below the ` +
      `floor of ${MIN_LINKS}. The crawl is almost certainly broken (wrong root, ` +
      `empty dist, or a build that produced no HTML) rather than genuinely clean.`,
  );
  process.exit(1);
}

console.log(`links ok: ${scanned.length} scanned, 0 broken (${result.links.length} incl. skipped)`);
