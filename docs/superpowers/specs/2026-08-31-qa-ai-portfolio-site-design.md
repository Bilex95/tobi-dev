# QA + AI Automation Portfolio Site — Design

- **Date:** 2026-08-31
- **Owner:** Sammy Bilex (GitHub: [Bilex95](https://github.com/Bilex95))
- **Site brand / wordmark:** Tobi-dev
- **Status:** Approved — ready for implementation plan

## 1. Purpose & positioning

One owned URL that presents the owner as a junior/mid **QA-automation + AI engineer**
and ties together the existing body of work. Primary audience: recruiters and hiring
managers for QA-automation / SDET / test-engineering roles who skim for 30–60 seconds
and then go deep on one case study. Secondary: peers and community arriving from
craft-factory digest issues.

**Success criteria**

- A live link usable on a résumé / LinkedIn by the end of one build session.
- Two credible case studies (assertkit, craft-factory) that show engineering
  judgement, not just "I made a thing".
- A projects gallery that stays current with zero manual work as craft-factory keeps
  publishing repos.
- Fast, mobile-correct, passes basic accessibility, and looks intentional rather than
  templated.
- The site's own QA suite (section 5) is itself presentable as portfolio evidence and
  cross-links to the assertkit case study.

**Non-goals:** a blog as an ongoing content commitment, live interactive demos, a CMS,
any backend service.

## 2. Scope

Merged from the earlier "A" (lean launch) and "B" (full showcase) options, **minus live
demos** (screenshots + terminal casts instead).

**In**

- Home / landing page
- Projects gallery — auto-generated from the GitHub API at build time, plus a small
  hand-set "featured" ordering
- Per-project detail pages
- Two long-form case studies: **assertkit (leads)**, craft-factory
- About + skills + downloadable CV + contact links
- Light/dark theme toggle (dark default)
- Blog scaffold + one seed post
- SEO: per-page meta, Open Graph images, sitemap, robots, JSON-LD `Person`
- Weekly automated rebuild via a GitHub Action + deploy hook
- A full QA test suite built alongside the site (section 5)
- Deploy to a free subdomain (`tobi-dev.vercel.app`)
- Screenshots and [asciinema](https://asciinema.org/) casts as the "demo" medium

**Out (documented backlog)**

- Live iframe of the assertkit `demo-app`; a web playground for `assertkit generate`
  (needs a rate-limited serverless function holding an Anthropic key + a hard token
  cap)
- Custom domain (later: buy `tobi.dev` or similar + point DNS, ~5 minutes)
- Analytics (optional add: Cloudflare Web Analytics or self-hosted Umami)
- Site search; dedicated tag pages beyond a client-side filter
- Any ongoing blog cadence
- Visual-regression SaaS (Percy / Chromatic); load / stress testing (static CDN site —
  N/A by design)

## 3. Architecture

Static site built with **Astro + Tailwind**, no runtime backend. Every piece of dynamic
data is resolved at build time.

**Tech**

- Astro 4.x with `@astrojs/mdx`, `@astrojs/sitemap`, `@astrojs/tailwind`
- Tailwind CSS with CSS custom properties for theme tokens
- TypeScript for `lib/` code
- Astro Content Collections for case studies, project overrides, and blog posts
- Node 20+

**Repo:** `Bilex95/tobi-dev` (public). **Local:** `C:\Users\HP\Downloads\tobi-dev`.

**Hosting:** Vercel free tier → `tobi-dev.vercel.app`. Deploy on push to `main` and via
a Deploy Hook. (The site brand "Tobi-dev" and the `Bilex95` GitHub handle differ until a
rename or a custom domain ties them together — tracked in the backlog.)

### 3.1 Directory layout

```
tobi-dev/
  astro.config.mjs
  tailwind.config.mjs
  package.json
  tsconfig.json
  playwright.config.ts
  lighthouserc.json
  lychee.toml
  .github/workflows/
    ci.yml                # build + unit + component + content + e2e + lighthouse + links + html-validate + audit
    rebuild.yml           # weekly cron + workflow_dispatch -> curls the deploy hook
    cross-browser.yml     # nightly Firefox + WebKit smoke
  public/
    cv/tobi-dev-qa.pdf
    og/*.png
    favicon.svg
    casts/*.cast          # asciinema recordings
  src/
    content/
      config.ts           # zod schemas for collections
      caseStudies/
        assertkit.mdx
        craft-factory.mdx
      projects/
        _overrides.json    # featured order, blurb/thumbnail overrides, hide list
      blog/
        building-a-portfolio-pipeline.mdx
    data/
      projects.cache.json  # committed fallback from the last successful API pull
    lib/
      github.ts            # fetch + normalize repos at build time, cache fallback
      theme.ts             # theme toggle (inline, no flash)
      seo.ts               # meta + JSON-LD helpers
    components/
      Nav.astro Footer.astro ThemeToggle.astro
      Hero.astro ProjectCard.astro TagFilter.astro
      CaseStudyLayout.astro Prose.astro AsciinemaPlayer.astro
      Diagram.astro        # inline SVG / mermaid wrapper
    layouts/
      Base.astro CaseStudy.astro Post.astro
    pages/
      index.astro
      work/index.astro
      work/[slug].astro    # per-project detail
      case-studies/[slug].astro
      blog/index.astro
      blog/[slug].astro
      about.astro
      404.astro
  test/
    unit/                  # node:test — github.ts, seo.ts, theme.ts
    component/             # Astro Container API — ProjectCard, Nav, TagFilter
    content/              # node:test — content-collection contract checks
  e2e/
    *.spec.ts             # Playwright — functional, a11y (axe), visual, responsive
    production.spec.ts    # post-deploy smoke against the live URL
```

### 3.2 Data flow — projects gallery

1. At build, `lib/github.ts` calls
   `GET https://api.github.com/users/Bilex95/repos?per_page=100&sort=updated&type=owner`.
   - Unauthenticated is fine (60 req/hr). If a `GITHUB_TOKEN` env var is present, use it
     to raise the limit and read topics reliably.
2. **Filter:** public, non-fork, and carries the topic `portfolio` — so a repo is opted
   in by tagging it. craft-factory already sets topics on publish; add `portfolio` to
   its topic list.
3. **Normalize** each repo to
   `{ slug, name, description, url, homepage, topics[], language, stars, pushedAt }`.
4. **Merge** `content/projects/_overrides.json`:
   - `featured`: ordered slugs shown first and on the home page
   - `hide`: slugs to drop
   - per-slug `{ blurb, thumbnail }` overrides
5. On success, write the normalized array to `src/data/projects.cache.json` (the
   rebuild Action commits it, so the file evolves over time). On API failure, load
   `projects.cache.json` and continue — **the build never breaks**.
6. `work/index.astro` renders the grid with a client-side tag filter (progressive
   enhancement — the full list renders without JS). `work/[slug].astro` renders a
   detail page from the same record plus any long-form notes in `_overrides.json` or a
   matching MDX file.

**craft-factory integration:** add `portfolio` to the topics array in its `publish.sh`,
and (optional) `curl -X POST "$PORTFOLIO_DEPLOY_HOOK"` at the end of a successful
publish so a new repo appears within minutes rather than up to a week.

### 3.3 Case studies

MDX in `content/caseStudies`. Frontmatter schema:
`title, slug, role, timeframe, stack[], repo, summary, order, draft`.

**assertkit leads** — it is the home-page hero's primary call to action and `order: 1`.
craft-factory is `order: 2`. Rationale: assertkit is the depth piece (AI integration +
test-design judgement — testing non-deterministic LLM output, a triage classifier that
gates CI, "never auto-runs or commits AI output"); craft-factory is the supporting act
(automation, CI/CD, consistency over months).

Shared `CaseStudy` layout: sticky sub-nav, single prose column, pulled-out decision
quotes, `Diagram` blocks, `AsciinemaPlayer` embeds, a "what's next" footer, and
prev/next links.

Each case study follows this arc:

1. **Context** — who it is for, why it exists
2. **Problem** — the specific testing / portfolio pain it addresses
3. **What I built** — features, with an architecture diagram
4. **Key decisions & tradeoffs** — e.g. "never auto-runs or commits AI output; a human
   reviews first"; "rotation indexes off `repos.json` length, not the ISO week"
5. **Verification** — assertkit: 30 `node:test` units + e2e (10 pass / 4 skip without
   an API key); craft-factory: a full end-to-end pipeline run
6. **Results & what's next** — links, and the explicit v1-scope exclusions

Draft sources: assertkit's `docs/DESIGN.md` and repo; the craft-factory session notes.
Use the `portfolio-case-study-writer` skill when writing these.

### 3.4 Theme, design, accessibility

- Dark default. `ThemeToggle` sets `data-theme` on `<html>`, persisted to
  `localStorage`, with an inline `<head>` script to prevent a flash of the wrong theme.
  First visit honours `prefers-color-scheme`.
- Theme tokens as CSS custom properties; Tailwind reads them. One restrained accent
  color.
- Type: one display face + a monospace for code and labels, self-hosted as woff2 with
  `font-display: swap`.
- Run the `frontend-design` skill during implementation for aesthetic direction so the
  result does not read as a template.
- Accessibility: semantic landmarks, visible focus rings, AA contrast,
  `prefers-reduced-motion` respected, alt text on every screenshot, keyboard-operable
  filter and theme toggle.

### 3.5 SEO

- `seo.ts` helper: per-page `<title>`, description, canonical, OG/Twitter tags.
- Static OG images in `public/og` — one per top-level page plus a template used for
  case studies and posts.
- `@astrojs/sitemap`, a `public/robots.txt`, and JSON-LD: `Person` on the home page,
  `CreativeWork` / `Article` on case studies and blog posts.

### 3.6 CI / automation

- `ci.yml` (pull requests + `main`): the full gated suite — see section 5.
- `cross-browser.yml`: nightly Firefox + WebKit Playwright smoke.
- `rebuild.yml`: `schedule` cron `20 11 * * 2` (≈15 minutes after craft-factory's
  Tuesday run) plus `workflow_dispatch`. Steps: pull repos via a small script that
  calls `github.ts`, commit an updated `projects.cache.json` if it changed, then
  `curl -X POST "$DEPLOY_HOOK"` (stored as a repo secret). Vercel rebuilds from `main`.

## 4. Error handling & edge cases

- **GitHub API down or rate-limited** → fall back to the committed
  `projects.cache.json`; log a warning; the build succeeds.
- **No repos tagged `portfolio` yet** → the gallery shows the `featured` overrides or a
  friendly empty state; the home page still renders.
- **Missing CV file** → the about page hides the download button rather than linking to
  a 404.
- **Missing asciinema cast** → the player component renders a static poster plus
  "recording coming soon".
- **Theme toggle before JS loads** → the inline head script handles it; no layout
  shift.
- **Deploy-hook secret absent** (a fork or PR) → the rebuild job is a no-op with a
  notice.

## 5. QA test plan

The suite is written **alongside** the site — unit tests before the `lib/` code they
cover — not bolted on afterward. Nothing in this plan runs before the site is built.

### 5.1 Test layers

| # | Layer | What it verifies | Tool | When |
|---|-------|------------------|------|------|
| 1 | Build / type / schema | `astro build` passes; TS types; content-collection frontmatter matches its zod schema | Astro CLI + `astro check` (`tsc`) | CI gate, every push |
| 2 | Unit | `github.ts` repo normalize + `portfolio`-topic filter + override merge + cache fallback on API failure; `seo.ts` meta/JSON-LD output; theme logic | `node:test` + mocked `fetch`, coverage via `c8` | CI gate |
| 3 | Component render | `ProjectCard`, `Nav`, `TagFilter` render expected DOM from given props / edge cases (missing blurb, no thumbnail) | Astro Container API + `node:test` | CI gate |
| 4 | Content contract | every case study has required fields; every `_overrides.json` slug maps to a real repo or is whitelisted; no orphan MDX | `node:test` over `getCollection()` | CI gate |
| 5 | E2E / functional | nav; theme toggle persists across reload; gallery filter filters + is keyboard-operable; case-study prev/next; CV link shown only when file exists; 404 renders | Playwright (Chromium) | CI gate |
| 6 | Accessibility | axe scan on every route (0 serious/critical); manual keyboard-only pass; screen-reader spot check on home + one case study | `@axe-core/playwright` in the Playwright run; `pa11y-ci` as CI alt; manual NVDA/VoiceOver | axe = CI gate; manual = pre-deploy checklist |
| 7 | Performance budgets | perf ≥ 95, a11y ≥ 100, SEO + best-practices scored; JS-weight budget enforces "ships near-zero JS" | Lighthouse CI (`lhci` with `assert` budgets) | CI gate on `/` + one case study |
| 8 | Visual regression | per-page baseline screenshots, light + dark, mobile + desktop; catches unintended layout shift | Playwright `toHaveScreenshot()` | CI, non-blocking (review diffs) |
| 9 | Link integrity | no broken internal links; external links (GitHub, LinkedIn, repo URLs) resolve; anchors exist | `lychee` over `dist/` | internal = CI gate; external = nightly, non-blocking |
| 10 | HTML validity | valid markup, one `h1` per page, landmark structure | `html-validate` | CI gate |
| 11 | SEO / metadata | unique title + description + canonical + OG image per page; `sitemap.xml` covers all routes; `robots.txt` present; JSON-LD parses and validates | custom assertions parsing built HTML + Playwright; manual Rich Results check | structural = CI gate; manual = pre-deploy |
| 12 | Responsive | 320 / 375 / 768 / 1024 / 1440 — no horizontal scroll, tap targets ≥ 44px | Playwright viewport projects | CI gate |
| 13 | Cross-browser smoke | key flows on Firefox + WebKit | Playwright projects | nightly (`cross-browser.yml`) |
| 14 | Dependency / secret hygiene | `npm audit` clean of high/critical; no committed secrets; lockfile present | `npm audit` + `gitleaks` | CI gate |
| 15 | Workflow test | `rebuild.yml` commits cache changes and calls the deploy hook correctly | `act` dry-run or `workflow_dispatch` against a test hook | pre-merge of the workflow, manual |
| 16 | Post-deploy smoke | live URL 200s over HTTPS; canonical host correct; social card renders; favicon loads | Playwright `production.spec.ts` against the live URL | after each Vercel deploy |

### 5.2 Test harness grouping

- `npm test` → unit + component + content (`node:test`)
- `npm run test:e2e` → Playwright (carries functional, axe, visual, responsive as
  projects; cross-browser is a separate nightly config)
- `npm run test:ci` → Lighthouse CI + `lychee` + `html-validate` + `npm audit` +
  `gitleaks`

### 5.3 Hard CI gates vs advisory

- **Hard gates (block merge):** layers 1, 2, 3, 4, 5, 7, 10, 11 (structural), 12, 14;
  layer 9 for internal links; layer 6 for the automated axe scan.
- **Advisory (run in CI, do not block initially):** layers 8, 13, and layer 9 external
  links.
- **Manual / pre-deploy checklist:** layer 6 keyboard + screen-reader, layer 11 Rich
  Results, layer 15.
- **Post-deploy:** layer 16.

### 5.4 Explicitly excluded, with rationale

- **Load / stress testing** — static, CDN-served; there is no origin to overwhelm.
  Recorded as N/A rather than silently skipped.
- **Visual-regression SaaS (Percy / Chromatic)** — cost; Playwright's built-in
  screenshots cover v1.
- **Security pen-testing** — no auth, no forms, no backend; hygiene scans (layer 14)
  plus a deployed security-headers check (layer 16) are proportionate.

## 6. Rollout

1. Scaffold Astro + Tailwind; base layout; nav / footer; theme toggle. Wire the test
   harness (`node:test`, Playwright, Lighthouse CI, lychee, html-validate) and `ci.yml`
   skeleton first.
2. `github.ts` + gallery + detail pages + cache fallback — unit + component + content
   tests written first (TDD).
3. Case-study layout + both case studies (screenshots + casts); assertkit leads.
4. About + CV + contact; blog scaffold + seed post.
5. SEO pass; OG images; sitemap / robots / JSON-LD; metadata assertions.
6. Full CI suite green; `rebuild.yml`; connect Vercel; verify the live URL; run the
   post-deploy smoke.
7. Tag existing repos with `portfolio`; add the topic + deploy-hook ping to
   craft-factory.
8. Add the link to the GitHub profile, LinkedIn, and CV.

## 7. Decisions (resolved)

- **Repo name:** `Bilex95/tobi-dev`.
- **Host:** Vercel free tier → `tobi-dev.vercel.app`. Custom domain deferred.
- **Lead case study:** assertkit (`order: 1`, home hero CTA); craft-factory second.
- **Site brand / display name:** Tobi-dev.
- **CV:** optional and non-blocking. If a PDF or CV text is provided it feeds the About
  page and case-study `role` / `timeframe` fields and is hosted at
  `public/cv/tobi-dev-qa.pdf`; otherwise About is stubbed from existing project notes
  and the PDF is added later (the download button hides until the file exists).
