/**
 * Regenerates the static Open Graph image at `public/og/default.png`.
 *
 * v1 has a single shared OG image for every page (per-page OG is backlog), so
 * this renders one 1200x630 branded card. Colours are hardcoded here on purpose:
 * this is a raster asset, not a themed page.
 *
 *   node scripts/make-og.mjs
 */
import { Buffer } from 'node:buffer';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const BRAND = 'Tobi-dev';
const TAGLINE = 'QA automation &amp; AI engineer';
const BG = '#0d1117';
const FG = '#e6edf3';
const ACCENT = '#58a6ff';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${BG}"/>
  <rect x="0" y="0" width="1200" height="10" fill="${ACCENT}"/>
  <text x="90" y="330" font-family="Helvetica, Arial, sans-serif" font-size="110" font-weight="700" fill="${FG}">${BRAND}</text>
  <text x="94" y="410" font-family="Helvetica, Arial, sans-serif" font-size="42" fill="${ACCENT}">${TAGLINE}</text>
</svg>`;

const out = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'og', 'default.png');
await mkdir(dirname(out), { recursive: true });
await sharp(Buffer.from(svg)).png().toFile(out);
console.log(`wrote ${out}`);
