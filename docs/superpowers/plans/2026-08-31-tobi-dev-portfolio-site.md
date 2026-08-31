# Tobi-dev Portfolio Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a fast, accessible, industry-grade portfolio site at `tobi-dev.vercel.app` that presents the owner as a QA-automation + AI engineer, with an auto-updating projects gallery and a full QA suite built alongside it.

**Architecture:** Static Astro + Tailwind site, no runtime backend. All dynamic data (the projects gallery) is resolved at build time from the GitHub REST API with a committed JSON cache as a fallback so builds never break. Content (case studies, blog) lives in Astro Content Collections as MDX validated by zod. A weekly GitHub Action refreshes the cache and pings a Vercel deploy hook.

**Tech Stack:** Astro 4.x, Tailwind CSS 3.x, TypeScript, `@astrojs/mdx`, `@astrojs/sitemap`, `@astrojs/tailwind`, `astro-og-canvas`, `node:test` + `tsx` + `c8` (unit/component/content), `@playwright/test` + `@axe-core/playwright` (e2e/a11y/visual/responsive), Lighthouse CI, `lychee` (links), `html-validate`, `gitleaks`.

**Spec:** `docs/superpowers/specs/2026-08-31-qa-ai-portfolio-site-design.md`

## Global Constraints

- **Runtime:** Node 20+ (uses `node --import tsx --test`, `--test` directory discovery).
- **Framework:** Astro `^4.10` (Container API needs ≥ 4.9), Tailwind `^3.4`.
- **No runtime backend.** Every dynamic value is resolved at build time. No serverless functions in v1.
- **Build must never fail on a GitHub API error.** `loadProjects()` falls back to `src/data/projects.cache.json` and logs a warning.
- **Repos are opted into the gallery by carrying the GitHub topic `portfolio`.** GitHub user is `Bilex95`.
- **Theme:** dark by default; first visit honours `prefers-color-scheme`; no flash of wrong theme (inline head script); choice persisted to `localStorage` key `tobi-theme`.
- **Accessibility:** semantic landmarks, visible focus, WCAG AA contrast, `prefers-reduced-motion` respected, alt text on every image. Automated axe scan must report 0 serious/critical.
- **Performance budgets (Lighthouse CI, `/` and `/case-studies/assertkit`):** performance ≥ 95, accessibility ≥ 100, total script transfer ≤ 40 KB per page.
- **Case study order:** `assertkit` is `order: 1` and the home hero's primary CTA; `craft-factory` is `order: 2`.
- **Brand wordmark:** `Tobi-dev`. **Deploy target:** `tobi-dev.vercel.app`.
- **Process:** TDD (test before implementation), DRY, YAGNI, commit after every green step.
- **Commit style:** Conventional Commits (`feat:`, `test:`, `chore:`, `ci:`, `docs:`).

---

## File Structure

| Path | Responsibility |
|------|----------------|
| `astro.config.mjs` | Astro + integrations config, `site` URL |
| `tailwind.config.mjs` | Tailwind theme reading CSS custom properties |
| `tsconfig.json` | TS strict config |
| `playwright.config.ts` | e2e projects: chromium, viewports; webServer = preview |
| `playwright.cross-browser.config.ts` | firefox + webkit smoke (nightly) |
| `lighthouserc.json` | Lighthouse CI assertions/budgets |
| `.lycheeignore` / `lychee.toml` | link-checker config |
| `.html-validate.json` | HTML validation rules |
| `src/lib/theme.ts` | pure theme-resolution logic |
| `src/lib/github.ts` | fetch + normalize + merge + cache-fallback for the gallery |
| `src/lib/seo.ts` | `<meta>` assembly + JSON-LD builders |
| `src/lib/cv.ts` | build-time check for the CV PDF |
| `src/content/config.ts` | zod schemas for `caseStudies` and `blog` collections |
| `src/content/projects/_overrides.json` | featured order, hide list, per-repo blurb/thumbnail |
| `src/data/projects.cache.json` | committed fallback snapshot of the normalized gallery |
| `src/components/*.astro` | `Nav`, `Footer`, `ThemeToggle`, `Hero`, `ProjectCard`, `TagFilter`, `Prose`, `Diagram`, `AsciinemaPlayer` |
| `src/layouts/*.astro` | `Base`, `CaseStudy`, `Post` |
| `src/pages/**` | routes (see spec §3.1) |
| `src/styles/global.css` | theme tokens (light + dark), base element styles |
| `scripts/refresh-projects.mjs` | CI script: refresh cache, commit if changed, curl deploy hook |
| `test/unit/**` | `node:test` — `theme`, `github`, `seo`, `cv` |
| `test/component/**` | `node:test` + Astro Container API — `ProjectCard`, `Nav`, `TagFilter` |
| `test/content/**` | `node:test` — collection contract checks |
| `test/build/**` | `node:test` — assertions over built `dist/` HTML (SEO/metadata) |
| `e2e/**` | Playwright specs (functional, a11y, visual, responsive) + `production.spec.ts` |
| `.github/workflows/{ci,rebuild,cross-browser}.yml` | pipelines |
| `docs/qa-manual-checklist.md` | pre-deploy manual QA steps |

---

## Task 1: Project scaffold, tooling, and CI skeleton

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tailwind.config.mjs`, `tsconfig.json`, `.gitignore`, `.nvmrc`
- Create: `src/styles/global.css`, `src/layouts/Base.astro`, `src/components/Nav.astro`, `src/components/Footer.astro`, `src/pages/index.astro`
- Create: `test/unit/smoke.test.ts`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: nothing.
- Produces: `Base.astro` (props: `{ title: string; description: string }`, renders `<slot />` inside `<Nav/>` + `<Footer/>`); npm scripts `dev`, `build`, `preview`, `test`, `test:e2e`, `test:ci`.

- [ ] **Step 1: Scaffold Astro and add integrations**

Run:
```bash
npm create astro@latest . -- --template minimal --no-install --no-git --typescript strict
npm pkg set type=module
npm install
npx astro add tailwind mdx sitemap --yes
npm install -D tsx c8 @playwright/test @axe-core/playwright html-validate
npm install astro-og-canvas
npx playwright install --with-deps chromium
node -v > .nvmrc
```

- [ ] **Step 2: Set npm scripts and Astro `site`**

Edit `package.json` scripts:
```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview --port 4321",
    "check": "astro check",
    "test": "c8 --reporter=text --reporter=lcov node --import tsx --test test/unit test/component test/content",
    "test:build": "node --import tsx --test test/build",
    "test:e2e": "playwright test",
    "test:xbrowser": "playwright test -c playwright.cross-browser.config.ts",
    "test:links": "lychee --config lychee.toml 'dist/**/*.html'",
    "test:html": "html-validate 'dist/**/*.html'",
    "test:lh": "lhci autorun",
    "test:ci": "npm run build && npm run test:build && npm run test:html && npm run test:links && npm run test:lh"
  }
}
```

In `astro.config.mjs` set `site: 'https://tobi-dev.vercel.app'` and confirm `integrations: [tailwind(), mdx(), sitemap()]`.

- [ ] **Step 3: Write theme tokens and base layout**

`src/styles/global.css` — define tokens on `:root` (light) and `:root[data-theme="dark"]` / `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` (dark), plus `*:focus-visible` ring, `@media (prefers-reduced-motion: reduce)` reset, and base typography. Minimum tokens: `--bg`, `--fg`, `--muted`, `--accent`, `--border`, `--card`.

`src/layouts/Base.astro`:
```astro
---
import '../styles/global.css';
import Nav from '../components/Nav.astro';
import Footer from '../components/Footer.astro';
const { title, description } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
  </head>
  <body>
    <a href="#main" class="skip-link">Skip to content</a>
    <Nav />
    <main id="main">
      <slot />
    </main>
    <Footer />
  </body>
</html>
```

`Nav.astro` — `<nav aria-label="Primary">` with the `Tobi-dev` wordmark linking `/` and links to `/work`, `/case-studies/assertkit`, `/blog`, `/about`. `Footer.astro` — `<footer>` with a copyright line and GitHub/LinkedIn links (placeholder `#` hrefs, finalised in Task 8).

`src/pages/index.astro` — render `<Base title="Tobi-dev — QA automation & AI engineer" description="...">` with a single `<h1>Tobi-dev</h1>` placeholder (home built in Task 7).

- [ ] **Step 4: Write the smoke test**

`test/unit/smoke.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('tooling: arithmetic sanity so the runner is wired', () => {
  assert.equal(1 + 1, 2);
});
```

- [ ] **Step 5: Run build + tests, verify green**

Run: `npm run build && npm test`
Expected: build writes `dist/index.html`; test run reports `1 passing`.

- [ ] **Step 6: Write CI skeleton**

`.github/workflows/ci.yml`:
```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }
jobs:
  build-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run check
      - run: npm run build
      - run: npm test
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Astro + Tailwind site, tooling, and CI skeleton"
```

---

## Task 2: Theme toggle (dark default, no flash)

**Files:**
- Create: `src/lib/theme.ts`, `src/components/ThemeToggle.astro`
- Modify: `src/layouts/Base.astro` (inline head script + mount toggle in `Nav`)
- Test: `test/unit/theme.test.ts`, `e2e/theme.spec.ts`

**Interfaces:**
- Consumes: `Base.astro` from Task 1.
- Produces: `resolveInitialTheme(stored: string | null, prefersDark: boolean): 'light' | 'dark'`; `nextTheme(current: 'light' | 'dark'): 'light' | 'dark'`; `THEME_KEY = 'tobi-theme'`.

- [ ] **Step 1: Write the failing unit test**

`test/unit/theme.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveInitialTheme, nextTheme, THEME_KEY } from '../../src/lib/theme.ts';

test('THEME_KEY is stable', () => assert.equal(THEME_KEY, 'tobi-theme'));

test('stored value wins over system preference', () => {
  assert.equal(resolveInitialTheme('light', true), 'light');
  assert.equal(resolveInitialTheme('dark', false), 'dark');
});

test('no stored value: dark is default, but light system pref is honoured', () => {
  assert.equal(resolveInitialTheme(null, true), 'dark');
  assert.equal(resolveInitialTheme(null, false), 'light');
});

test('invalid stored value is ignored', () => {
  assert.equal(resolveInitialTheme('banana', true), 'dark');
});

test('nextTheme flips', () => {
  assert.equal(nextTheme('light'), 'dark');
  assert.equal(nextTheme('dark'), 'light');
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --import tsx --test test/unit/theme.test.ts`
Expected: FAIL — cannot find module `src/lib/theme.ts`.

- [ ] **Step 3: Implement `src/lib/theme.ts`**

```ts
export const THEME_KEY = 'tobi-theme';
export type Theme = 'light' | 'dark';

export function resolveInitialTheme(stored: string | null, prefersDark: boolean): Theme {
  if (stored === 'light' || stored === 'dark') return stored;
  return prefersDark ? 'dark' : 'light';
}

export function nextTheme(current: Theme): Theme {
  return current === 'dark' ? 'light' : 'dark';
}
```

Note: default is `dark` only when the system does not report a light preference; a browser with no `prefers-color-scheme` support reports `prefersDark = false` → treat that case in the inline script by defaulting the media query to dark (see Step 5).

- [ ] **Step 4: Run test, verify it passes**

Run: `node --import tsx --test test/unit/theme.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Add the no-flash inline script and the toggle**

In `Base.astro` `<head>`, before the stylesheet, add a raw inline script (`is:inline`):
```astro
<script is:inline>
  (function () {
    try {
      var s = localStorage.getItem('tobi-theme');
      var mql = window.matchMedia('(prefers-color-scheme: light)');
      var t = (s === 'light' || s === 'dark') ? s : (mql.matches ? 'light' : 'dark');
      document.documentElement.dataset.theme = t;
    } catch (e) {
      document.documentElement.dataset.theme = 'dark';
    }
  })();
</script>
```

`src/components/ThemeToggle.astro` — a `<button type="button" aria-label="Toggle color theme" data-theme-toggle>` with sun/moon inline SVG. Client script (module):
```astro
<script>
  import { nextTheme, THEME_KEY } from '../lib/theme.ts';
  const btn = document.querySelector('[data-theme-toggle]');
  btn?.addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
    const t = nextTheme(cur);
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem(THEME_KEY, t); } catch {}
    btn.setAttribute('aria-pressed', String(t === 'dark'));
  });
</script>
```
Mount `<ThemeToggle />` in `Nav.astro`.

- [ ] **Step 6: Write the e2e test**

`e2e/theme.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('theme toggle flips and persists across reload', async ({ page }) => {
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.click('[data-theme-toggle]');
  await expect(html).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'light');
});
```

- [ ] **Step 7: Add `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/production.spec.ts'],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: { baseURL: 'http://localhost:4321' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

- [ ] **Step 8: Run e2e, verify pass**

Run: `npm run test:e2e -- theme.spec.ts`
Expected: 1 passed.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: dark-default theme toggle with no-flash init and persistence"
```

---

## Task 3: GitHub data layer (`src/lib/github.ts`)

**Files:**
- Create: `src/lib/github.ts`, `src/content/projects/_overrides.json`, `src/data/projects.cache.json`
- Test: `test/unit/github.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Project = { slug: string; name: string; description: string; url: string; homepage: string | null; topics: string[]; language: string | null; stars: number; pushedAt: string; blurb?: string; thumbnail?: string; featured: boolean }`
  - `type Overrides = { featured: string[]; hide: string[]; entries: Record<string, { blurb?: string; thumbnail?: string }> }`
  - `normalizeRepo(raw: any): Project` (raw is a GitHub REST repo object; `featured` defaults `false`)
  - `applyOverrides(projects: Project[], overrides: Overrides): Project[]` — drops `hide`, sets `featured` + moves featured first in `featured` order, applies `blurb`/`thumbnail`
  - `filterPortfolio(projects: Project[]): Project[]` — keeps `topics.includes('portfolio')`
  - `async loadProjects(opts?: { fetchImpl?: typeof fetch; token?: string; cachePath?: string; overridesPath?: string }): Promise<Project[]>` — fetch → filter → normalize → applyOverrides; on any throw or non-OK response, read + parse the cache file and return that (still `applyOverrides`-d); logs `console.warn('[github] falling back to cache: ...')`

- [ ] **Step 1: Seed the override and cache files**

`src/content/projects/_overrides.json`:
```json
{
  "featured": ["assertkit", "craft-factory"],
  "hide": [],
  "entries": {
    "assertkit": { "blurb": "AI-assisted Playwright spec generation + failure triage for CI gating." },
    "craft-factory": { "blurb": "A GitHub Actions pipeline that publishes a portfolio repo on a schedule." }
  }
}
```

`src/data/projects.cache.json`: `[]` (populated by the first successful CI refresh; a hand-written entry for `assertkit` and `craft-factory` may be added so local builds render something).

- [ ] **Step 2: Write the failing unit test**

`test/unit/github.test.ts`:
```ts
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
```

Also create `test/fixtures/cache.sample.json` with one normalized `assertkit` object (all `Project` fields present, `featured: false`).

- [ ] **Step 3: Run test, verify it fails**

Run: `node --import tsx --test test/unit/github.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `src/lib/github.ts`**

```ts
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

export async function loadProjects(opts: {
  fetchImpl?: typeof fetch; token?: string;
  cachePath?: string; overridesPath?: string;
} = {}): Promise<Project[]> {
  const f = opts.fetchImpl ?? fetch;
  const cachePath = opts.cachePath ?? 'src/data/projects.cache.json';
  const overridesPath = opts.overridesPath ?? 'src/content/projects/_overrides.json';
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
    return applyOverrides(filterPortfolio(projects), overrides);
  } catch (err) {
    console.warn(`[github] falling back to cache: ${(err as Error).message}`);
    const cached: Project[] = JSON.parse(await readFile(cachePath, 'utf8'));
    return applyOverrides(cached, overrides);
  }
}
```

- [ ] **Step 5: Run test, verify it passes**

Run: `node --import tsx --test test/unit/github.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: build-time GitHub gallery data layer with cache fallback"
```

---

## Task 4: Projects gallery pages

**Files:**
- Create: `src/components/ProjectCard.astro`, `src/components/TagFilter.astro`
- Create: `src/pages/work/index.astro`, `src/pages/work/[slug].astro`
- Test: `test/component/project-card.test.ts`, `test/component/tag-filter.test.ts`, `e2e/gallery.spec.ts`

**Interfaces:**
- Consumes: `loadProjects` and `Project` from Task 3; `Base.astro` from Task 1.
- Produces: `ProjectCard` (prop `project: Project`), `TagFilter` (prop `tags: string[]`); routes `/work` and `/work/<slug>`.

- [ ] **Step 1: Write the failing component test for `ProjectCard`**

`test/component/project-card.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --import tsx --test test/component/project-card.test.ts`
Expected: FAIL — component missing.

- [ ] **Step 3: Implement `ProjectCard.astro`**

```astro
---
import type { Project } from '../lib/github.ts';
const { project } = Astro.props as { project: Project };
const text = project.blurb ?? project.description;
---
<article class="card">
  {project.thumbnail && <img src={project.thumbnail} alt={`${project.name} preview`} loading="lazy" />}
  <h3><a href={`/work/${project.slug}`}>{project.name}</a></h3>
  {text && <p>{text}</p>}
  <ul class="tags" aria-label="Tech tags">
    {project.topics.filter((t) => t !== 'portfolio').map((t) => <li>{t}</li>)}
  </ul>
  <p class="links">
    <a href={project.url}>Code</a>
    {project.homepage && <a href={project.homepage}>Live</a>}
  </p>
</article>
```

- [ ] **Step 4: Run test, verify it passes**

Run: `node --import tsx --test test/component/project-card.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Write the failing test for `TagFilter`**

`test/component/tag-filter.test.ts` — assert it renders one `<button data-tag="...">` per tag plus an "All" button, each keyboard-focusable (`type="button"`), and includes an `aria-pressed` attribute on "All" defaulting to `true`.

- [ ] **Step 6: Run it (fails), implement `TagFilter.astro`, run again (passes)**

`TagFilter.astro` renders the button row and ships a small module script that toggles `hidden` on `[data-project][data-tags~="<tag>"]` cards and manages `aria-pressed`. The card list in `work/index.astro` must render fully server-side; the script only filters.

- [ ] **Step 7: Implement the gallery routes**

`src/pages/work/index.astro`:
```astro
---
import Base from '../../layouts/Base.astro';
import ProjectCard from '../../components/ProjectCard.astro';
import TagFilter from '../../components/TagFilter.astro';
import { loadProjects } from '../../lib/github.ts';
const projects = await loadProjects({ token: import.meta.env.GITHUB_TOKEN });
const tags = [...new Set(projects.flatMap((p) => p.topics))].filter((t) => t !== 'portfolio').sort();
---
<Base title="Work — Tobi-dev" description="Projects and experiments in QA automation and AI.">
  <h1>Work</h1>
  <TagFilter tags={tags} />
  <div class="grid">
    {projects.map((p) => (
      <div data-project data-tags={p.topics.join(' ')}><ProjectCard project={p} /></div>
    ))}
  </div>
</Base>
```

`src/pages/work/[slug].astro` — `getStaticPaths()` maps `loadProjects()` to `{ params: { slug }, props: { project } }`; the page renders name, full description, tags, `pushedAt`, links, and (if a matching `src/content/projects/<slug>.md` exists) its rendered body.

- [ ] **Step 8: Write and run the e2e test**

`e2e/gallery.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('gallery lists projects and the tag filter narrows them by keyboard', async ({ page }) => {
  await page.goto('/work');
  const cards = page.locator('[data-project]');
  await expect(cards.first()).toBeVisible();
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'qa' }).press('Enter');
  await expect(page.locator('[data-project]:not([hidden])')).toHaveCount(
    await page.locator('[data-project][data-tags~="qa"]').count(),
  );
});

test('gallery renders project names without JavaScript', async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto('/work');
  await expect(page.locator('[data-project]').first()).toBeVisible();
  await ctx.close();
});
```

Run: `npm run test:e2e -- gallery.spec.ts` → expect 2 passed. (Requires at least the two seed entries in `projects.cache.json`.)

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: projects gallery with server-rendered cards and progressive tag filter"
```

---

## Task 5: Content collections + case study layout

**Files:**
- Create: `src/content/config.ts`
- Create: `src/layouts/CaseStudy.astro`, `src/components/Prose.astro`, `src/components/Diagram.astro`, `src/components/AsciinemaPlayer.astro`
- Create: `src/pages/case-studies/[slug].astro`
- Create: `src/content/caseStudies/assertkit.mdx` (skeleton), `src/content/caseStudies/craft-factory.mdx` (skeleton)
- Test: `test/content/collections.test.ts`, `e2e/case-study.spec.ts`

**Interfaces:**
- Consumes: `Base.astro`.
- Produces: `caseStudies` collection with schema `{ title, slug, role, timeframe, stack: string[], repo, summary, order, draft }`; route `/case-studies/<slug>`; `CaseStudy.astro` (props: the collection entry's `data` + `<slot />` for rendered body).

- [ ] **Step 1: Write the failing content-contract test**

`test/content/collections.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

const DIR = 'src/content/caseStudies';
const REQUIRED = ['title', 'slug', 'role', 'timeframe', 'stack', 'repo', 'summary', 'order'];

test('every case study has all required frontmatter keys', async () => {
  const files = (await readdir(DIR)).filter((f) => f.endsWith('.mdx'));
  assert.ok(files.length >= 2);
  for (const f of files) {
    const src = await readFile(`${DIR}/${f}`, 'utf8');
    const fm = src.split('---')[1] ?? '';
    for (const key of REQUIRED) {
      assert.match(fm, new RegExp(`^${key}:`, 'm'), `${f} missing ${key}`);
    }
  }
});

test('case study order values are unique and assertkit is order 1', async () => {
  const files = (await readdir(DIR)).filter((f) => f.endsWith('.mdx'));
  const orders = new Map<string, number>();
  for (const f of files) {
    const fm = (await readFile(`${DIR}/${f}`, 'utf8')).split('---')[1];
    orders.set(f, Number(fm.match(/^order:\s*(\d+)/m)![1]));
  }
  assert.equal(new Set(orders.values()).size, orders.size, 'orders must be unique');
  assert.equal(orders.get('assertkit.mdx'), 1);
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `node --import tsx --test test/content/collections.test.ts`
Expected: FAIL — directory or files missing.

- [ ] **Step 3: Define the schema and skeleton entries**

`src/content/config.ts`:
```ts
import { defineCollection, z } from 'astro:content';

const caseStudies = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    role: z.string(),
    timeframe: z.string(),
    stack: z.array(z.string()),
    repo: z.string().url(),
    summary: z.string(),
    order: z.number().int().positive(),
    draft: z.boolean().default(false),
  }),
});

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    summary: z.string(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { caseStudies, blog };
```

`src/content/caseStudies/assertkit.mdx` skeleton:
```mdx
---
title: "assertkit — AI-assisted Playwright specs and failure triage"
slug: "assertkit"
role: "Solo build"
timeframe: "August 2026"
stack: ["Node.js", "Playwright", "node:test", "Anthropic SDK", "GitHub Actions"]
repo: "https://github.com/Bilex95/assertkit"
summary: "A CLI that turns acceptance criteria into reviewed Playwright specs and classifies test failures so CI can gate on real regressions."
order: 1
draft: false
---

## Context

_TODO in Task 6._

## Problem

## What I built

## Key decisions & tradeoffs

## Verification

## Results & what's next
```

`craft-factory.mdx` — same shape, `order: 2`, `slug: "craft-factory"`, `repo: "https://github.com/Bilex95/craft-factory"`. The `## TODO in Task 6` marker is acceptable here **only** because Task 6 fills it and the content-contract test does not inspect body prose; the placeholder scan in self-review must confirm Task 6 exists.

- [ ] **Step 4: Implement layout, helper components, and the route**

`Prose.astro` — wraps `<slot />` in `<div class="prose">` with typographic styles. `Diagram.astro` — `<figure>` accepting a `<slot />` of inline SVG plus a `caption` prop and `role="img"` + `aria-label`. `AsciinemaPlayer.astro` — props `{ src: string; title: string }`; renders a `<figure>` with a `<script>` that lazy-loads the asciinema-player web component from a **locally vendored** copy in `public/vendor/` (no external CDN); if `src` file is absent at build (checked via `import.meta.glob`), render a `<p>` poster fallback.

`src/pages/case-studies/[slug].astro`:
```astro
---
import { getCollection } from 'astro:content';
import Base from '../../layouts/Base.astro';
import CaseStudy from '../../layouts/CaseStudy.astro';
export async function getStaticPaths() {
  const entries = (await getCollection('caseStudies')).filter((e) => !e.data.draft);
  const sorted = entries.sort((a, b) => a.data.order - b.data.order);
  return sorted.map((entry, i) => ({
    params: { slug: entry.data.slug },
    props: { entry, prev: sorted[i - 1] ?? null, next: sorted[i + 1] ?? null },
  }));
}
const { entry, prev, next } = Astro.props;
const { Content } = await entry.render();
---
<Base title={`${entry.data.title} — Tobi-dev`} description={entry.data.summary}>
  <CaseStudy data={entry.data} prev={prev} next={next}>
    <Content />
  </CaseStudy>
</Base>
```

`CaseStudy.astro` renders the title, a metadata row (`role`, `timeframe`, `stack` chips, repo link), a sticky in-page sub-nav built from the section headings, `<slot />` inside `<Prose>`, and prev/next links.

- [ ] **Step 5: Run content test + build, verify green**

Run: `node --import tsx --test test/content/collections.test.ts && npm run build`
Expected: tests PASS; build emits `/case-studies/assertkit/index.html` and `/case-studies/craft-factory/index.html`.

- [ ] **Step 6: Write and run the e2e test**

`e2e/case-study.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('assertkit case study renders and links forward to craft-factory', async ({ page }) => {
  await page.goto('/case-studies/assertkit');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('assertkit');
  await page.getByRole('link', { name: /craft-factory/i }).click();
  await expect(page).toHaveURL(/\/case-studies\/craft-factory/);
});
```

Run: `npm run test:e2e -- case-study.spec.ts` → 1 passed.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: content collections, case-study layout, and routes"
```

---

## Task 6: Write the two case studies

**Files:**
- Modify: `src/content/caseStudies/assertkit.mdx`, `src/content/caseStudies/craft-factory.mdx`
- Create: `public/img/case-studies/*` (screenshots), `public/casts/*.cast` (optional)
- Test: existing `test/content/collections.test.ts`, `e2e/case-study.spec.ts`

**Interfaces:**
- Consumes: `Diagram`, `AsciinemaPlayer`, `Prose` from Task 5.
- Produces: finished prose; no new code interfaces.

- [ ] **Step 1: Invoke the case-study skill**

Run the `portfolio-case-study-writer` skill. Feed it, per case study, the source material:
- assertkit: the repo `README`, `docs/DESIGN.md`, `docs/testing-ai-output.md`, and the verification facts (30 `node:test` units pass; e2e 10 pass / 4 skip without `ANTHROPIC_API_KEY`; strict-mode selector fix in commit `6d667bf`; out of scope: self-healing locators, visual regression, non-Playwright frameworks).
- craft-factory: the repo, and the pipeline facts (Tue = new project + digest, Thu = refinement pass; workflow `craft-project.yml`, cron `5 11 * * 2,4`; rotation indexes off `repos.json` length not ISO week; classic PAT with `repo` scope required; `execFileSync` + `--body-file -` fix in commit `12f0f90`; ~13 projects over a 3-month campaign).

- [ ] **Step 2: Fill each of the six sections**

For each `.mdx`, replace the `_TODO in Task 6._` and empty headings with real prose following the spec §3.3 arc (Context → Problem → What I built → Key decisions & tradeoffs → Verification → Results & what's next). Requirements:
- At least one `<Diagram caption="...">` block with hand-written inline SVG (assertkit: the `generate` / `triage` data flow; craft-factory: the Tue/Thu workflow branch).
- Pull at least two "key decision" statements into `<blockquote>` elements.
- Every screenshot uses `![alt text](/img/case-studies/<file>)` with descriptive alt text.
- End "Results & what's next" with an explicit bullet list of v1-scope exclusions.

- [ ] **Step 3: Run the checks**

Run: `node --import tsx --test test/content && npm run build && npm run test:e2e -- case-study.spec.ts`
Expected: all green; no `TODO`/`TBD` string remains in either file (grep to confirm: `grep -rniE "tbd|todo|fill in" src/content/caseStudies` returns nothing).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "docs: write the assertkit and craft-factory case studies"
```

---

## Task 7: Home page

**Files:**
- Create: `src/components/Hero.astro`
- Modify: `src/pages/index.astro`
- Test: `e2e/home.spec.ts`

**Interfaces:**
- Consumes: `loadProjects` (Task 3), `Base` (Task 1), `ProjectCard` (Task 4), `getCollection('caseStudies')` (Task 5).
- Produces: the `/` page; no reused code interface.

- [ ] **Step 1: Write the failing e2e test**

`e2e/home.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('home hero CTA points at the assertkit case study', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const cta = page.getByRole('link', { name: /read the assertkit case study/i });
  await expect(cta).toHaveAttribute('href', '/case-studies/assertkit');
});

test('home shows featured projects and a contact link', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-project]')).not.toHaveCount(0);
  await expect(page.getByRole('link', { name: /email|contact/i })).toBeVisible();
});
```

- [ ] **Step 2: Run it, verify it fails**

Run: `npm run test:e2e -- home.spec.ts`
Expected: FAIL — placeholder home page lacks these elements.

- [ ] **Step 3: Implement `Hero.astro` and the home page**

`Hero.astro` — `<section>` with `<h1>Tobi-dev</h1>`, a one-line positioning statement, and two CTAs: primary `<a href="/case-studies/assertkit">Read the assertkit case study</a>`, secondary `<a href="/work">See all work</a>`.

`src/pages/index.astro` — render `Base` → `Hero` → a "Featured" section mapping the `featured` subset of `loadProjects()` through `ProjectCard` (wrapped in `[data-project]`) → a two-card "Case studies" strip linking both studies in `order` → a contact strip with an email link and GitHub/LinkedIn.

- [ ] **Step 4: Run tests, verify pass**

Run: `npm run test:e2e -- home.spec.ts`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: home page with hero, featured projects, and case-study CTAs"
```

---

## Task 8: About, CV, and contact

**Files:**
- Create: `src/lib/cv.ts`, `src/pages/about.astro`
- Modify: `src/components/Footer.astro` (real links)
- Test: `test/unit/cv.test.ts`, `e2e/about.spec.ts`

**Interfaces:**
- Consumes: `Base`.
- Produces: `hasCv(globResult: Record<string, unknown>): boolean`; `CONTACT = { email: 'sammybilex@gmail.com', github: 'https://github.com/Bilex95', linkedin: '<TBD-user-supplies>' }` — **the LinkedIn URL must be obtained from the user before this task; do not invent one.**

- [ ] **Step 1: Resolve the LinkedIn URL**

Ask the user for their LinkedIn profile URL. If unavailable, omit the LinkedIn link entirely (do not use a placeholder href).

- [ ] **Step 2: Write the failing unit test**

`test/unit/cv.test.ts`:
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hasCv } from '../../src/lib/cv.ts';

test('hasCv is true only when the glob found a file', () => {
  assert.equal(hasCv({ '/public/cv/tobi-dev-qa.pdf': () => ({}) }), true);
  assert.equal(hasCv({}), false);
});
```

- [ ] **Step 3: Run it (fails), implement `src/lib/cv.ts`**

```ts
export function hasCv(glob: Record<string, unknown>): boolean {
  return Object.keys(glob).length > 0;
}
```

- [ ] **Step 4: Run it, verify pass**

Run: `node --import tsx --test test/unit/cv.test.ts` → PASS.

- [ ] **Step 5: Implement `about.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import { hasCv } from '../lib/cv.ts';
const cv = hasCv(import.meta.glob('/public/cv/*.pdf', { eager: true }));
---
<Base title="About — Tobi-dev" description="QA automation and AI engineer.">
  <h1>About</h1>
  <p><!-- 2–3 sentence bio positioning for QA-automation / SDET roles. Draw from CV text if supplied; otherwise summarise assertkit + craft-factory. --></p>
  <h2>Skills</h2>
  <ul>
    <li>Test automation: Playwright, end-to-end &amp; component testing</li>
    <li>Languages/runtime: JavaScript, TypeScript, Node.js, <code>node:test</code></li>
    <li>CI/CD: GitHub Actions, test gating, Lighthouse budgets</li>
    <li>AI: testing non-deterministic LLM output, Anthropic SDK</li>
  </ul>
  {cv && <p><a href="/cv/tobi-dev-qa.pdf" download>Download CV (PDF)</a></p>}
  <h2>Contact</h2>
  <ul>
    <li><a href="mailto:sammybilex@gmail.com">sammybilex@gmail.com</a></li>
    <li><a href="https://github.com/Bilex95">GitHub</a></li>
    <!-- LinkedIn <li> only if the URL was supplied in Step 1 -->
  </ul>
</Base>
```

Update `Footer.astro` with the same GitHub/email (and LinkedIn if supplied) links.

- [ ] **Step 6: Write and run the e2e test**

`e2e/about.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('about page shows contact links and hides CV button when no PDF is present', async ({ page }) => {
  await page.goto('/about');
  await expect(page.getByRole('link', { name: 'sammybilex@gmail.com' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'GitHub' })).toBeVisible();
  // With no PDF committed yet, the download link must be absent:
  await expect(page.getByRole('link', { name: /download cv/i })).toHaveCount(0);
});
```

Run: `npm run test:e2e -- about.spec.ts` → 1 passed. (When a real `public/cv/tobi-dev-qa.pdf` is added later, flip this assertion to `toHaveCount(1)` in the same commit as the PDF.)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: about page with skills, conditional CV download, and contact links"
```

---

## Task 9: Blog scaffold + seed post

**Files:**
- Create: `src/layouts/Post.astro`, `src/pages/blog/index.astro`, `src/pages/blog/[slug].astro`
- Create: `src/content/blog/building-a-portfolio-pipeline.mdx`
- Test: `test/content/blog.test.ts`, `e2e/blog.spec.ts`

**Interfaces:**
- Consumes: `blog` collection schema (Task 5), `Base`.
- Produces: routes `/blog` and `/blog/<slug>`.

- [ ] **Step 1: Write the failing content test**

`test/content/blog.test.ts` — assert `src/content/blog` has ≥ 1 non-draft `.mdx`, each with `title`, `date`, `summary` frontmatter keys, and `date` parseable by `new Date()`.

- [ ] **Step 2: Run it (fails). Create the seed post**

`src/content/blog/building-a-portfolio-pipeline.mdx`:
```mdx
---
title: "Building a portfolio that maintains itself"
date: 2026-08-31
summary: "Why craft-factory publishes a repo on a schedule, and how this site stays current without me touching it."
draft: false
---

<!-- 300–600 words, drafted from the craft-factory notes: the Tue/Thu cadence,
     the rotation-bug fix, and how this site's weekly rebuild consumes the output. -->
```

- [ ] **Step 3: Implement the routes and `Post.astro`**

`blog/index.astro` lists non-draft posts sorted by `date` desc with title, date, summary. `blog/[slug].astro` mirrors the case-study route pattern (getStaticPaths over `getCollection('blog')`, render `<Content/>` inside `Post.astro` → `Prose`). `Post.astro` shows title + formatted date + body.

- [ ] **Step 4: Write and run the e2e test**

`e2e/blog.spec.ts` — `/blog` shows the seed post title; clicking it lands on `/blog/building-a-portfolio-pipeline` with an `<h1>` match.

Run: `node --import tsx --test test/content/blog.test.ts && npm run test:e2e -- blog.spec.ts` → all green.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: blog scaffold with seed post"
```

---

## Task 10: SEO layer (meta, JSON-LD, sitemap, OG images)

**Files:**
- Create: `src/lib/seo.ts`
- Modify: `src/layouts/Base.astro` (consume `seo.ts`), `astro.config.mjs` (sitemap + og-canvas)
- Create: `src/pages/og/[...route].ts` (astro-og-canvas endpoint), `public/robots.txt`
- Test: `test/unit/seo.test.ts`, `test/build/metadata.test.ts`

**Interfaces:**
- Consumes: `Base` from Task 1 (extend its props), `astro-og-canvas`.
- Produces:
  - `buildMeta(input: { title: string; description: string; path: string; image?: string }): { title: string; tags: Array<{ name?: string; property?: string; content: string }>; canonical: string }`
  - `personJsonLd(): object`
  - `articleJsonLd(input: { headline: string; description: string; datePublished?: string; path: string }): object`
  - `SITE = 'https://tobi-dev.vercel.app'`

- [ ] **Step 1: Write the failing unit test**

`test/unit/seo.test.ts`:
```ts
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

test('personJsonLd is a valid Person node', () => {
  const p: any = personJsonLd();
  assert.equal(p['@type'], 'Person');
  assert.equal(p.url, SITE);
});

test('articleJsonLd carries headline and mainEntityOfPage', () => {
  const a: any = articleJsonLd({ headline: 'H', description: 'd', path: '/blog/x' });
  assert.equal(a['@type'], 'Article');
  assert.equal(a.mainEntityOfPage, `${SITE}/blog/x`);
});
```

- [ ] **Step 2: Run it (fails). Implement `src/lib/seo.ts`**

Implement the three builders + `SITE`. `buildMeta` defaults `image` to `${SITE}/og${path === '/' ? '/index' : path}.png`. Include `og:type`, `og:url`, `og:title`, `og:description`, `og:image`, `twitter:card`, `twitter:title`, `twitter:description`.

- [ ] **Step 3: Run it, verify pass**

Run: `node --import tsx --test test/unit/seo.test.ts` → PASS (3 tests).

- [ ] **Step 4: Wire into `Base.astro` and config**

`Base.astro` now takes `path` (default `Astro.url.pathname`) and optional `image`/`jsonLd`; it renders `buildMeta(...)` tags, `<link rel="canonical">`, and a `<script type="application/ld+json">` when `jsonLd` is passed. Home passes `personJsonLd()`; case studies and blog posts pass `articleJsonLd(...)`.

`astro.config.mjs` — add `sitemap()` (already present) and configure `astro-og-canvas` per its README: an endpoint at `src/pages/og/[...route].ts` generating 1200×630 PNGs with the page title on the brand background. `public/robots.txt`:
```
User-agent: *
Allow: /
Sitemap: https://tobi-dev.vercel.app/sitemap-index.xml
```

- [ ] **Step 5: Write the failing build-metadata test**

`test/build/metadata.test.ts` (runs against `dist/` after `npm run build`):
```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

async function htmlFiles(dir: string, acc: string[] = []): Promise<string[]> {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await htmlFiles(p, acc);
    else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

test('every page has a unique non-empty <title> and a canonical link', async () => {
  const files = await htmlFiles('dist');
  const titles = new Set<string>();
  for (const f of files) {
    const html = await readFile(f, 'utf8');
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1]?.trim();
    assert.ok(title, `${f} has no <title>`);
    assert.ok(!titles.has(title!), `duplicate title: ${title}`);
    titles.add(title!);
    assert.match(html, /<link rel="canonical" href="https:\/\/tobi-dev\.vercel\.app/, `${f} missing canonical`);
    assert.match(html, /property="og:image"/, `${f} missing og:image`);
  }
});

test('home page embeds valid Person JSON-LD', async () => {
  const html = await readFile('dist/index.html', 'utf8');
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(m, 'no JSON-LD block');
  const parsed = JSON.parse(m![1]);
  assert.equal(parsed['@type'], 'Person');
});

test('sitemap and robots exist', async () => {
  await readFile('dist/robots.txt', 'utf8');
  const idx = await readFile('dist/sitemap-index.xml', 'utf8');
  assert.match(idx, /sitemap/);
});
```

- [ ] **Step 6: Run build + build-metadata test, verify green**

Run: `npm run build && npm run test:build`
Expected: all assertions pass. Fix any duplicate/empty titles found.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: SEO layer — meta tags, JSON-LD, sitemap, OG images"
```

---

## Task 11: Accessibility, Lighthouse, HTML validation, responsive gates

**Files:**
- Create: `e2e/a11y.spec.ts`, `e2e/responsive.spec.ts`, `e2e/visual.spec.ts`
- Create: `lighthouserc.json`, `.html-validate.json`
- Modify: `playwright.config.ts` (add viewport projects)

**Interfaces:**
- Consumes: all routes built by Tasks 4–10.
- Produces: no code interface; adds CI gates.

- [ ] **Step 1: Write the axe a11y spec**

`e2e/a11y.spec.ts`:
```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = ['/', '/work', '/case-studies/assertkit', '/case-studies/craft-factory', '/blog', '/about', '/404'];

for (const route of routes) {
  test(`no serious/critical axe violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    const bad = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(bad, JSON.stringify(bad.map((v) => v.id), null, 2)).toEqual([]);
  });
}
```

- [ ] **Step 2: Run it, fix violations until green**

Run: `npm run test:e2e -- a11y.spec.ts`
Expected: iterate on `global.css` / markup (landmarks, labels, contrast) until all routes pass.

- [ ] **Step 3: Write the responsive spec**

`e2e/responsive.spec.ts` — for widths `[320, 375, 768, 1024, 1440]`, `page.setViewportSize`, load `/` and `/work`, assert `document.scrollingElement.scrollWidth <= innerWidth + 1` (no horizontal scroll) and that every `<a>`/`<button>` in the nav has a bounding box ≥ 44×44 CSS px.

- [ ] **Step 4: Write the visual-regression spec (non-blocking)**

`e2e/visual.spec.ts` — for `['/','/work','/case-studies/assertkit']` in both themes, `await expect(page).toHaveScreenshot(...)`. First run creates baselines under `e2e/visual.spec.ts-snapshots/`. Commit the baselines.

- [ ] **Step 5: Add Lighthouse CI config**

`lighthouserc.json`:
```json
{
  "ci": {
    "collect": {
      "staticDistDir": "./dist",
      "url": ["http://localhost/index.html", "http://localhost/case-studies/assertkit/index.html"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.95 }],
        "categories:accessibility": ["error", { "minScore": 1.0 }],
        "categories:seo": ["warn", { "minScore": 0.95 }],
        "resource-summary:script:size": ["error", { "maxNumericValue": 40960 }]
      }
    },
    "upload": { "target": "temporary-public-storage" }
  }
}
```
Install: `npm i -D @lhci/cli`.

- [ ] **Step 6: Add HTML validation config**

`.html-validate.json`:
```json
{
  "extends": ["html-validate:recommended"],
  "rules": {
    "no-inline-style": "off",
    "require-sri": "off",
    "heading-level": "error",
    "no-missing-references": "error"
  }
}
```

- [ ] **Step 7: Run the full CI-local suite**

Run: `npm run test:ci && npm run test:e2e`
Expected: build, `test:build`, `test:html`, `test:lh` all pass; e2e (functional + a11y + responsive) green; visual creates/matches baselines.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "test: a11y (axe), responsive, visual, Lighthouse, and HTML-validate gates"
```

---

## Task 12: Link integrity + dependency/secret hygiene

**Files:**
- Create: `lychee.toml`, `.gitleaks.toml`
- Modify: `package.json` (audit script)

**Interfaces:**
- Consumes: `dist/` output.
- Produces: `npm run test:links`, `npm run test:audit`.

- [ ] **Step 1: Add `lychee.toml`**

```toml
[input]
# checked in CI against dist/**/*.html
[exclude]
# nothing yet
[check]
max_redirects = 5
timeout = 20
accept = [200, 206, 429]
```
Internal-only mode for the blocking CI step uses `--offline` plus `--include-fragments`; a separate nightly job drops `--offline` to check external URLs.

- [ ] **Step 2: Add the audit script**

`package.json`: `"test:audit": "npm audit --audit-level=high"`.

- [ ] **Step 3: Add `.gitleaks.toml`**

Use the gitleaks default ruleset (`[extend] useDefault = true`); add an allowlist entry for `sammybilex@gmail.com` (a public contact address, not a secret) and for `e2e/visual.spec.ts-snapshots/`.

- [ ] **Step 4: Run locally**

Run:
```bash
npm run build
npx lychee --offline --include-fragments 'dist/**/*.html'
npm run test:audit
npx gitleaks detect --no-banner --config .gitleaks.toml
```
Expected: no broken internal links; no high/critical advisories (bump deps if any); no leaks.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test: link integrity, npm audit, and gitleaks hygiene checks"
```

---

## Task 13: Full CI wiring + nightly cross-browser

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `.github/workflows/cross-browser.yml`, `playwright.cross-browser.config.ts`

**Interfaces:**
- Consumes: every script defined so far.
- Produces: green required checks on PRs.

- [ ] **Step 1: Expand `ci.yml`**

Jobs (all on `ubuntu-latest`, Node 20, `npm ci`):
```yaml
jobs:
  unit:
    steps: [checkout, setup-node, "npm ci", "npm run check", "npm test"]
  e2e:
    steps: [checkout, setup-node, "npm ci", "npx playwright install --with-deps chromium", "npm run test:e2e"]
  quality:
    steps: [checkout, setup-node, "npm ci", "npm run build", "npm run test:build", "npm run test:html", "npx lychee --offline --include-fragments 'dist/**/*.html'", "npm run test:lh"]
  hygiene:
    steps: [checkout, setup-node, "npm ci", "npm run test:audit", "gitleaks/gitleaks-action@v2"]
```
Mark `unit`, `e2e`, `quality`, `hygiene` as required in branch protection. The `visual` project runs inside `e2e` but with `--update-snapshots` disabled; a diff fails the job as advisory-only for the first two weeks (documented in the job summary), then promote.

- [ ] **Step 2: Add `playwright.cross-browser.config.ts`**

Same as `playwright.config.ts` but `projects: [{ name: 'firefox', use: devices['Desktop Firefox'] }, { name: 'webkit', use: devices['Desktop Safari'] }]` and `testMatch: ['theme.spec.ts','gallery.spec.ts','home.spec.ts','case-study.spec.ts']`.

- [ ] **Step 3: Add `cross-browser.yml`**

`on: { schedule: [{ cron: '0 6 * * *' }], workflow_dispatch: {} }`; one job runs `npx playwright install --with-deps firefox webkit` then `npm run test:xbrowser`; on failure it opens/updates an issue via `actions/github-script`.

- [ ] **Step 4: Push a branch and confirm all checks pass**

Run: `git push -u origin <branch>` and open a draft PR. Verify `unit`, `e2e`, `quality`, `hygiene` are green.

- [ ] **Step 5: Commit (config only; CI already committed via push)**

```bash
git add -A
git commit -m "ci: full pipeline (unit, e2e, quality, hygiene) + nightly cross-browser"
```

---

## Task 14: Cache-refresh workflow, Vercel deploy, craft-factory hook

**Files:**
- Create: `scripts/refresh-projects.mjs`, `.github/workflows/rebuild.yml`
- Create: `e2e/production.spec.ts`
- Create: `docs/deploy.md`

**Interfaces:**
- Consumes: `src/lib/github.ts` (`loadProjects` invoked with a token), `projects.cache.json`.
- Produces: a scheduled job that keeps `projects.cache.json` current and triggers redeploys.

- [ ] **Step 1: Write `scripts/refresh-projects.mjs`**

```js
import { writeFile, readFile } from 'node:fs/promises';
import { loadProjects } from '../src/lib/github.ts';

const token = process.env.GITHUB_TOKEN;
const fresh = await loadProjects({ token });
// strip override-derived fields so the cache stays a raw normalized snapshot
const snapshot = fresh.map(({ blurb, thumbnail, featured, ...rest }) => rest);
const path = 'src/data/projects.cache.json';
const prev = await readFile(path, 'utf8').catch(() => '');
const next = JSON.stringify(snapshot, null, 2) + '\n';
if (prev.trim() === next.trim()) {
  console.log('cache unchanged');
  process.exit(0);
}
await writeFile(path, next);
console.log(`cache updated: ${snapshot.length} projects`);
```
Run with `node --import tsx scripts/refresh-projects.mjs`.

- [ ] **Step 2: Write `.github/workflows/rebuild.yml`**

```yaml
name: Refresh projects cache
on:
  schedule: [{ cron: '20 11 * * 2' }]
  workflow_dispatch: {}
permissions: { contents: write }
jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: node --import tsx scripts/refresh-projects.mjs
        env: { GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }} }
      - name: Commit cache if changed
        run: |
          if ! git diff --quiet -- src/data/projects.cache.json; then
            git config user.name "tobi-dev-bot"
            git config user.email "actions@github.com"
            git add src/data/projects.cache.json
            git commit -m "chore: refresh projects cache"
            git push
          fi
      - name: Trigger redeploy
        if: ${{ env.DEPLOY_HOOK != '' }}
        env: { DEPLOY_HOOK: ${{ secrets.VERCEL_DEPLOY_HOOK }} }
        run: curl -fsS -X POST "$DEPLOY_HOOK"
```

- [ ] **Step 3: Write `e2e/production.spec.ts`**

```ts
import { test, expect } from '@playwright/test';
const BASE = process.env.PROD_URL ?? 'https://tobi-dev.vercel.app';

test('production home responds over HTTPS with the right canonical', async ({ page }) => {
  const res = await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  expect(res?.status()).toBe(200);
  expect(page.url()).toMatch(/^https:\/\//);
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', new RegExp(BASE.replace(/\./g, '\\.')));
});

test('production social card and favicon load', async ({ request }) => {
  const og = await request.get(`${BASE}/og/index.png`);
  expect(og.ok()).toBeTruthy();
  const fav = await request.get(`${BASE}/favicon.svg`);
  expect(fav.ok()).toBeTruthy();
});
```
Run manually post-deploy: `PROD_URL=https://tobi-dev.vercel.app npx playwright test e2e/production.spec.ts --config playwright.config.ts` (this file is excluded from the default run via `testIgnore`).

- [ ] **Step 4: Write `docs/deploy.md` (manual steps)**

Document, as a checklist the owner runs once:
1. Create the GitHub repo `Bilex95/tobi-dev`, push `main`.
2. Import the repo in Vercel (framework auto-detected as Astro), first deploy → note the `*.vercel.app` URL.
3. Vercel → Settings → Git → **Deploy Hooks** → create hook for `main` → copy URL.
4. GitHub repo → Settings → Secrets → Actions → add `VERCEL_DEPLOY_HOOK`.
5. Add the topic `portfolio` to `assertkit`, `craft-factory`, and any other repos to feature (`gh repo edit Bilex95/<repo> --add-topic portfolio`).
6. In `Bilex95/craft-factory`: add `portfolio` to the topics array in `publish.sh`, and append `curl -fsS -X POST "$PORTFOLIO_DEPLOY_HOOK" || true` after a successful publish; add `PORTFOLIO_DEPLOY_HOOK` to that repo's secrets.
7. Run `Refresh projects cache` once via **workflow_dispatch**; confirm it commits a populated `projects.cache.json` and the site redeploys.
8. Run the post-deploy smoke (Step 3).

- [ ] **Step 5: Verify the script locally**

Run: `node --import tsx scripts/refresh-projects.mjs` (unauthenticated is fine locally).
Expected: prints `cache updated: N projects` or `cache unchanged`; `git diff` shows only `projects.cache.json`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "ci: weekly projects-cache refresh + deploy hook; add production smoke + deploy docs"
```

---

## Task 15: Manual QA checklist, README, launch

**Files:**
- Create: `docs/qa-manual-checklist.md`, `README.md`

**Interfaces:**
- Consumes: the finished site.
- Produces: launch documentation.

- [ ] **Step 1: Write `docs/qa-manual-checklist.md`**

A run-before-each-deploy checklist covering the non-automatable layers from spec §5.3:
- Keyboard-only pass: tab through `/`, `/work`, one case study — focus visible at every stop, filter operable, theme toggle operable, no keyboard trap.
- Screen-reader spot check (NVDA on Windows): landmark navigation on `/` and `/case-studies/assertkit`; headings form a sensible outline; images announce meaningful alt text.
- Social preview: paste the prod URL into the [Facebook Sharing Debugger] and [X Card Validator] — title, description, image render.
- Google [Rich Results Test] on `/` (Person) and one case study (Article) — no errors.
- `act` dry run of `rebuild.yml`: `act workflow_dispatch -W .github/workflows/rebuild.yml -n`.
- Reduced-motion: enable OS "reduce motion", reload `/` — no non-essential animation.

- [ ] **Step 2: Write `README.md`**

Cover: what the site is, `tobi-dev.vercel.app`, local dev (`npm install`, `npm run dev`), the test commands and what each covers (link to the spec §5 table), how the gallery auto-updates, and where the deploy runbook lives (`docs/deploy.md`).

- [ ] **Step 3: Final full verification**

Run:
```bash
npm run check && npm test && npm run test:build && npm run test:e2e && npm run test:ci
```
Expected: every command exits 0. Record the actual summary lines in the commit body.

- [ ] **Step 4: Execute the deploy runbook**

Follow `docs/deploy.md` steps 1–8. Capture the live URL and the post-deploy smoke result.

- [ ] **Step 5: Commit and tag**

```bash
git add -A
git commit -m "docs: manual QA checklist and README; v1 launch"
git tag v1.0.0
```

- [ ] **Step 6: Wire the link out**

Add `tobi-dev.vercel.app` to the GitHub profile, LinkedIn, and CV. Pin `assertkit` and `craft-factory` on the GitHub profile (web UI → "Customize your pins").

---

## Self-Review

**1. Spec coverage**

| Spec section | Task(s) |
|--------------|---------|
| §2 Home / landing | 7 |
| §2 Projects gallery (API + featured) | 3, 4 |
| §2 Per-project detail pages | 4 (Step 7) |
| §2 Two case studies (assertkit leads) | 5, 6 |
| §2 About + skills + CV + contact | 8 |
| §2 Light/dark toggle | 2 |
| §2 Blog scaffold + seed post | 9 |
| §2 SEO (meta, OG, sitemap, robots, JSON-LD) | 10 |
| §2 Weekly automated rebuild | 14 |
| §2 QA suite alongside the site | 2–13, 15 |
| §2 Deploy to free subdomain | 14, 15 |
| §2 Screenshots + asciinema casts | 5 (`AsciinemaPlayer`), 6 |
| §3.2 Data flow + cache fallback | 3 |
| §3.2 craft-factory topic + hook | 14 (Step 4) |
| §3.3 Case-study arc + layout | 5, 6 |
| §3.4 Theme/design/a11y | 2, 11 |
| §3.5 SEO details | 10 |
| §3.6 ci.yml / cross-browser.yml / rebuild.yml | 13, 14 |
| §4 Error handling & edge cases | 3 (API down, no tagged repos), 8 (missing CV), 5 (missing cast), 2 (flash), 14 (missing hook secret) |
| §5.1 layers 1–4 | 1, 3, 4, 5, 9 |
| §5.1 layer 5 (e2e) | 2, 4, 5, 7, 8, 9 |
| §5.1 layer 6 (axe + manual) | 11, 15 |
| §5.1 layer 7 (Lighthouse) | 11 |
| §5.1 layer 8 (visual) | 11 |
| §5.1 layer 9 (links) | 12 |
| §5.1 layer 10 (html-validate) | 11 |
| §5.1 layer 11 (SEO assertions) | 10 |
| §5.1 layer 12 (responsive) | 11 |
| §5.1 layer 13 (cross-browser) | 13 |
| §5.1 layer 14 (audit + gitleaks) | 12 |
| §5.1 layer 15 (workflow test) | 15 (`act` dry run) |
| §5.1 layer 16 (post-deploy smoke) | 14 |
| §7 decisions (repo, host, lead, brand, CV) | 1, 3, 5, 7, 8, 14 |

No gaps.

**2. Placeholder scan**

- The only `_TODO_` markers introduced (Task 5 skeleton `.mdx`) are explicitly consumed by Task 6, whose Step 3 greps to prove they are gone. Acceptable.
- Task 8 `CONTACT.linkedin` is a real unknown, not a plan placeholder: Task 8 Step 1 requires obtaining it from the user and Step 5 omits the link if absent — no fake href is ever written.
- `about.astro` bio is an HTML comment describing exact content to write from a known source (CV text or the two projects), not a "fill in later".
- No "add error handling" / "write tests for the above" style steps: every test step contains runnable code or an exact assertion description.

**3. Type consistency**

- `Project` shape defined in Task 3 is reused verbatim in Tasks 4, 7, 14. `loadProjects(opts)` signature is identical across Tasks 3, 4, 14.
- `buildMeta` / `personJsonLd` / `articleJsonLd` signatures defined in Task 10 match their call sites in the same task.
- `THEME_KEY = 'tobi-theme'` is consistent between `theme.ts` (Task 2), the inline script, and the client script.
- `hasCv(glob)` signature matches between Task 8 test and implementation.
- `SITE`/`PROD_URL` both resolve to `https://tobi-dev.vercel.app`.

No inconsistencies found.
