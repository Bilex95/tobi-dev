# tobi-dev

A static [Astro](https://astro.build) portfolio for a QA-automation + AI
engineer. It presents two lead projects as full case studies (`assertkit`,
`craft-factory`), an auto-updating gallery of `Bilex95`'s public work, a short
blog, and an about/CV/contact page. The site ships near-zero client JS, supports
light/dark, carries per-page SEO metadata (OpenGraph, sitemap, `robots.txt`,
JSON-LD), and is built with its QA suite as a first-class part of the repo. It
deploys to <https://tobi-dev.vercel.app>.

## Local development

Requires **Node 22** (`.nvmrc`).

```bash
npm install
npm run dev       # dev server at http://localhost:4321
npm run build     # static build to dist/
npm run preview   # serve the built dist/ at http://localhost:4321
```

`npm run check` runs `astro check` (TypeScript + content-collection schema).

## Tests / gates

Full test plan: `docs/superpowers/specs/2026-08-31-qa-ai-portfolio-site-design.md`
§5. Manual pre-deploy steps that can't be automated:
`docs/qa-manual-checklist.md`.

| Command | Covers |
|---|---|
| `npm test` | Unit + component + content (`node:test`, coverage via `c8`): `github.ts` repo normalize / `portfolio`-topic filter / override merge / cache fallback / memoization, `seo.ts` meta + JSON-LD, `format.ts`, theme logic; `ProjectCard` and `TagFilter` render via the Astro Container API; content-collection contract — required frontmatter keys and unique `order` — by reading the `.mdx` files. |
| `npm run test:build` | SEO / metadata assertions parsing the built `dist/` HTML: every page has a unique non-empty `<title>`, a canonical link, and an `og:image`; the home page embeds valid `Person` JSON-LD; `robots.txt` and `sitemap-index.xml` exist; `/404` is `noindex` with no canonical. |
| `npm run test:e2e` | Playwright (Chromium): functional flows (nav, theme persists across reload, gallery filter filters + is keyboard-operable, case-study prev/next, CV link shown only when the file exists, 404), the `@axe-core/playwright` scan (`wcag2a`/`wcag2aa`, 0 serious/critical) on every route, and responsive checks (320–1440, no horizontal scroll, nav tap targets ≥ 44px). `production.spec.ts` is excluded by config; CI also passes `--grep-invert @visual`, so the bare script additionally runs the visual specs against the committed per-platform baselines. |
| `npm run test:html` | `html-validate:recommended` + `heading-level` + `no-missing-references` over `dist/**/*.html`. |
| `npm run test:links` | `scripts/check-links.mjs` — `linkinator` crawls the built site's internal links (external URLs skipped); fails on a broken link or if it scans fewer than 10 (a guard against a silently-empty crawl). |
| `npm run test:lh` | Lighthouse CI (`lhci autorun`) on `/` + one case study — perf ≥ 95, a11y = 100, JS-weight budget. **CI / Linux only** (`chrome-launcher` throws EPERM on Windows). |
| `npm run test:audit` | `npm audit --audit-level=high` — **advisory**, expected to exit non-zero (pre-existing high advisories in the dev/build chain; tracked in `docs/deploy.md` §10). |

Extra scripts: `npm run test:xbrowser` (Firefox + WebKit, nightly config),
`npm run test:links:external` (recursive, nightly), `npm run test:ci`
(`build` → `test:build` → `test:html` → `test:links` → `test:lh`).

`@visual` specs (`e2e/visual.spec.ts`) run via
`npx playwright test e2e/visual.spec.ts`; baselines are checked in per-platform
and the CI `visual` job is non-blocking until Linux baselines land
(`docs/deploy.md` §10).

CI: `.github/workflows/ci.yml` (blocking: `unit`, `e2e`, `quality`, `hygiene`),
`.github/workflows/cross-browser.yml` (nightly, advisory).

## How the projects gallery stays current

At build time, `src/lib/github.ts` pulls `Bilex95`'s public repos tagged with the
`portfolio` GitHub topic, merges `src/data/projects.overrides.json`
(blurb / featured / hide), and renders the gallery. If that fetch fails or no
repo is tagged yet, it falls back to `src/data/projects.cache.json` — an offline
floor snapshot (two seed entries: `assertkit`, `craft-factory`).

The **Refresh projects cache** Action
(`.github/workflows/rebuild.yml`) re-pulls from the live GitHub API on a weekly
schedule (Tuesday, ~15 min after `craft-factory`'s publish) and on
`workflow_dispatch`. It runs `scripts/refresh-projects.mjs`, which writes a
neutral snapshot only — it commits `src/data/projects.cache.json` when it
changed and POSTs the Vercel deploy hook (`VERCEL_DEPLOY_HOOK` secret) to
trigger a rebuild. No change / API error / no tagged repos → the file is left
untouched and the job is a no-op.

## Deploying / first launch

See **`docs/deploy.md`** — the one-time owner runbook: create the GitHub repo,
import into Vercel, wire the deploy hook, branch protection (incl. the
Actions-bot bypass the weekly refresh needs), tag repos, run the first refresh,
and the post-deploy smoke (`playwright.prod.config.ts` against the live URL).
Pre-deploy manual QA: **`docs/qa-manual-checklist.md`**.

A `v1.0.0` tag is created locally at the end of the branch build; push it
(`git push origin v1.0.0`) only after `build/portfolio-v1` is merged to `main`.
