/**
 * Refreshes `src/data/projects.cache.json` from the live GitHub API.
 *
 * This is the fallback data the gallery renders when the build-time fetch in
 * `src/lib/github.ts` fails or finds no `portfolio`-tagged repos. It MUST stay a
 * neutral, raw-normalised snapshot: `{ slug, name, description, url, homepage,
 * topics, language, stars, pushedAt }` with NO override-derived fields
 * (`blurb` / `thumbnail` / `featured`).
 *
 * Per ruling R23 this script deliberately does NOT call `loadProjects()`:
 * `loadProjects` applies overrides — it reorders by `featured`, injects `blurb`,
 * and permanently DROPS `hide`d entries — so writing its output back to the
 * cache would corrupt the snapshot. Instead we do our own raw fetch + normalise
 * and strip any derived fields defensively.
 *
 * Run locally (unauthenticated is fine):
 *   node --import tsx scripts/refresh-projects.mjs
 *
 * In CI it runs with GITHUB_TOKEN set (see .github/workflows/rebuild.yml).
 * On any API error, or when there are no portfolio repos / no change, it leaves
 * the cache file untouched and returns without error.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { normalizeRepo, filterPortfolio } from '../src/lib/github.ts';

const API = 'https://api.github.com/users/Bilex95/repos?per_page=100&sort=updated&type=owner';
const CACHE_PATH = 'src/data/projects.cache.json';

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const res = await fetch(API, {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    console.log(`[refresh] GitHub API ${res.status} — leaving cache untouched`);
    return;
  }

  const raw = await res.json();
  const snapshot = filterPortfolio(
    raw.filter((r) => !r.fork && !r.private).map(normalizeRepo),
  ).map(({ blurb, thumbnail, featured, ...rest }) => rest); // strip derived fields defensively

  if (snapshot.length === 0) {
    console.log('[refresh] no portfolio-tagged repos — leaving cache untouched');
    return;
  }

  const prev = await readFile(CACHE_PATH, 'utf8').catch(() => '');
  const next = JSON.stringify(snapshot, null, 2) + '\n';

  if (prev.trim() === next.trim()) {
    console.log('[refresh] cache unchanged');
    return;
  }

  await writeFile(CACHE_PATH, next);
  console.log(`[refresh] cache updated: ${snapshot.length} projects`);
}

main().catch((err) => {
  console.error(`[refresh] unexpected error — leaving cache untouched: ${err?.message ?? err}`);
  process.exitCode = 1;
});
