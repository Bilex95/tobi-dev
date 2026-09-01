import { readFile } from 'node:fs/promises';

export type Project = {
  slug: string; name: string; description: string; url: string;
  homepage: string | null; topics: string[]; language: string | null;
  stars: number; pushedAt: string; blurb?: string; thumbnail?: string; featured: boolean;
};
export type Overrides = {
  featured: string[]; hide: string[];
  entries: Record<string, { blurb?: string; thumbnail?: string }>;
};

const API = 'https://api.github.com/users/Bilex95/repos?per_page=100&sort=updated&type=owner';

export function normalizeRepo(raw: any): Project {
  return {
    slug: raw.name,
    name: raw.name,
    description: raw.description ?? '',
    url: raw.html_url,
    homepage: raw.homepage ? String(raw.homepage) : null,
    topics: Array.isArray(raw.topics) ? raw.topics : [],
    language: raw.language ?? null,
    stars: raw.stargazers_count ?? 0,
    pushedAt: raw.pushed_at,
    featured: false,
  };
}

export function filterPortfolio(projects: Project[]): Project[] {
  return projects.filter((p) => p.topics.includes('portfolio'));
}

export function applyOverrides(projects: Project[], o: Overrides): Project[] {
  const hidden = new Set(o.hide);
  const kept = projects.filter((p) => !hidden.has(p.slug));
  for (const p of kept) {
    const e = o.entries[p.slug];
    if (e?.blurb) p.blurb = e.blurb;
    if (e?.thumbnail) p.thumbnail = e.thumbnail;
    p.featured = o.featured.includes(p.slug);
  }
  const rank = (s: string) => {
    const i = o.featured.indexOf(s);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return kept.sort((a, b) => {
    const r = rank(a.slug) - rank(b.slug);
    return r !== 0 ? r : b.pushedAt.localeCompare(a.pushedAt);
  });
}

export type LoadOpts = {
  fetchImpl?: typeof fetch; token?: string;
  cachePath?: string; overridesPath?: string;
};

let _projects: Promise<Project[]> | null = null;

/**
 * Build-time project loader, memoized at module scope.
 *
 * Three pages call this (`/`, `/work`, `/work/[slug]`). Without the memo that is
 * three GitHub API calls per build against a 60/hr unauthenticated limit, and —
 * worse — the calls can *disagree*: one succeeds live while a later one is rate
 * limited into the cache, so a featured card on the home page can link to a
 * `/work/<slug>` that `getStaticPaths` never generated. One shared promise makes
 * every page render from the same snapshot.
 *
 * Calls that pass test seams (`fetchImpl` / `cachePath` / `overridesPath`)
 * bypass the memo entirely, so unit tests stay independent of each other.
 */
export function loadProjects(opts: LoadOpts = {}): Promise<Project[]> {
  if (opts.fetchImpl || opts.cachePath || opts.overridesPath) return _loadProjects(opts);
  return (_projects ??= _loadProjects(opts));
}

async function _loadProjects(opts: LoadOpts = {}): Promise<Project[]> {
  const f = opts.fetchImpl ?? fetch;
  const cachePath = opts.cachePath ?? 'src/data/projects.cache.json';
  const overridesPath = opts.overridesPath ?? 'src/data/projects.overrides.json';
  const overrides: Overrides = JSON.parse(await readFile(overridesPath, 'utf8'));
  try {
    const res = await f(API, {
      headers: {
        Accept: 'application/vnd.github+json',
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      },
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const raw = await res.json();
    const projects = (raw as any[]).filter((r) => !r.fork && !r.private).map(normalizeRepo);
    const portfolio = applyOverrides(filterPortfolio(projects), overrides);
    // No repos are topic-tagged `portfolio` yet: treat as a cache-miss so the
    // seeded cache renders instead of an empty gallery.
    if (portfolio.length === 0) throw new Error('NO_PORTFOLIO_REPOS');
    return portfolio;
  } catch (err) {
    const message = (err as Error).message;
    console.warn(
      message === 'NO_PORTFOLIO_REPOS'
        ? '[github] no portfolio-tagged repos yet, using cache'
        : `[github] falling back to cache: ${message}`,
    );
    const cached: Project[] = JSON.parse(await readFile(cachePath, 'utf8'));
    return applyOverrides(cached, overrides);
  }
}
