# Deploy runbook — tobi-dev

A one-time checklist the site owner runs to take this branch live on Vercel and
wire up the weekly cache-refresh loop. Everything here is a manual step performed
from the owner's account — the repo build (Tasks 1–14) does none of it.

Prerequisites: the [`gh`](https://cli.github.com/) CLI authenticated as `Bilex95`,
a Vercel account, and this branch (`build/portfolio-v1`) checked out locally.

---

## 1. Create the GitHub repo

Run this exact sequence from the repo root while on `build/portfolio-v1`:

```bash
# 1. create the repo and push the current branch
gh repo create Bilex95/tobi-dev --public --source . --remote origin --push

# 2. create `main` on the remote from this branch's commit, and make it default
git push origin build/portfolio-v1:main
gh repo edit Bilex95/tobi-dev --default-branch main

# 3. make your local checkout track main (optional but tidy)
git branch --move build/portfolio-v1 main
git branch --set-upstream-to=origin/main main
```

The rest of this runbook assumes `main` is the production branch. (If you would
rather keep a PR-based history, open a PR from a feature branch **after** step 3
above — but `main` must exist first, and §4's `CACHE_PUSH_TOKEN` must be set or
the weekly refresh push will be rejected.)

## 2. Import into Vercel

1. Vercel dashboard → **Add New… → Project** → import `Bilex95/tobi-dev`.
2. Framework preset auto-detects as **Astro**. Leave build command
   (`astro build`) and output directory (`dist`) at their defaults.
3. Deploy. Note the assigned `*.vercel.app` URL.
4. **Production domain is `https://tobi-dev-bilex95s-projects.vercel.app`** — claim it under
   Settings → Domains (`tobi-dev.vercel.app` was already taken by an unrelated
   account). If you ever move to a different domain, update the hard-coded site
   URL in these four places and redeploy:
   - `site:` in `astro.config.mjs`
   - `SITE` in `src/lib/seo.ts`
   - `Sitemap:` line in `public/robots.txt`
   - `BASE` default in `e2e/production.spec.ts`
   (plus the `parsed.url` assertion in `test/build/metadata.test.ts`).

## 3. Deploy hook

1. Vercel → project → **Settings → Git → Deploy Hooks**.
2. Create a hook for the `main` branch (name it e.g. `cache-refresh`). Copy the URL.
3. Add it as a GitHub Actions secret on `Bilex95/tobi-dev`:

```bash
gh secret set VERCEL_DEPLOY_HOOK --repo Bilex95/tobi-dev
# paste the hook URL when prompted
```

The `Refresh projects cache` workflow's final step POSTs to this hook only when
the secret is present; without it that step is a harmless no-op.

## 4. Branch protection

**Already configured** on `main` (via `gh api`, 2026-09-01):

- Required status checks before a **PR** can merge: `unit`, `e2e`, `quality`,
  `hygiene`. `visual` is intentionally not required — it is advisory
  (`continue-on-error`) until Linux screenshot baselines land (see punch list).
- Force-pushes and branch deletion on `main` are blocked.
- No "require a pull request" rule, and `enforce_admins: false` — so a repo
  **admin** can push directly to `main`, and required checks then run on that
  commit after the fact.

The default `GITHUB_TOKEN` in `.github/workflows/rebuild.yml` pushes as
`github-actions[bot]`, which is **not** an admin, so `enforce_admins: false`
does not cover it and its cache-refresh push is rejected with "N of N required
status checks are expected". The fix is a **fine-grained PAT** that pushes as
the owner:

1. Create it at github.com → Settings → Developer settings → **Fine-grained
   personal access tokens** → Generate new token, as `Bilex95`:
   - **Resource owner:** `Bilex95`
   - **Repository access:** Only select repositories → `Bilex95/tobi-dev`
   - **Repository permissions → Contents:** Read and write
     (Metadata: Read-only is added automatically; nothing else is needed)
   - **Expiration:** the longest you can (fine-grained PATs cap at 366 days —
     put a calendar reminder to regenerate, or use "No expiration" if the
     account allows it)
2. Add it as an Actions secret:

   ```bash
   gh secret set CACHE_PUSH_TOKEN --repo Bilex95/tobi-dev
   # paste the token when prompted
   ```

`rebuild.yml`'s `actions/checkout` uses this token, so its `git push` lands as
`Bilex95` and clears the admin bypass. No branch-protection change is required.

Inspect or change protection:

```bash
gh api repos/Bilex95/tobi-dev/branches/main/protection
```

To make it stricter (a PR for every change), add "Require a pull request before
merging" in Settings → Branches — then switch `rebuild.yml` to open an
auto-merging PR (`peter-evans/create-pull-request` + `gh pr merge --auto`)
instead of pushing, still using `CACHE_PUSH_TOKEN` so the required checks fire.

## 5. Tag repos

The gallery only shows repos with the `portfolio` topic:

```bash
gh repo edit Bilex95/assertkit      --add-topic portfolio
gh repo edit Bilex95/craft-factory  --add-topic portfolio
gh repo edit Bilex95/tobi-dev       --add-topic portfolio
# …plus any other repo you want featured
```

Until the topic propagates through the GitHub API, the gallery renders the two
seed entries (`assertkit`, `craft-factory`) from the cache floor in
`src/data/projects.cache.json` — that is expected, not a bug.

## 6. craft-factory hook

In `Bilex95/craft-factory` (a **separate** repo — do this from there, not here):

1. Add `portfolio` to the topics array in `publish.sh` so every repo it
   publishes is gallery-eligible from the start.
2. After a successful publish, trigger a redeploy of this site:

   ```bash
   curl -fsS -X POST "$PORTFOLIO_DEPLOY_HOOK" || true
   ```

3. Add `PORTFOLIO_DEPLOY_HOOK` to `craft-factory`'s Actions secrets — use the
   **same** Vercel deploy hook URL from step 3:

   ```bash
   gh secret set PORTFOLIO_DEPLOY_HOOK --repo Bilex95/craft-factory
   ```

## 7. First refresh

First confirm §4's **`CACHE_PUSH_TOKEN`** secret is set — without it this run
fails at the `git push` step (`protected branch hook declined`).

Kick the weekly workflow manually to populate the cache now instead of waiting
for Tuesday:

```bash
gh workflow run "Refresh projects cache" --repo Bilex95/tobi-dev

# wait for the run just started (resolves its id — no interactive prompt)
gh run watch "$(gh run list --workflow='Refresh projects cache' -L1 --json databaseId -q '.[0].databaseId')" --repo Bilex95/tobi-dev
```

Confirm the run committed an updated, populated `src/data/projects.cache.json`
(commit message `chore: refresh projects cache`) and that Vercel redeployed.

## 8. Post-deploy smoke

`e2e/production.spec.ts` is excluded from the normal `npm run test:e2e` run via
`testIgnore` in `playwright.config.ts` (which also excludes it when named on the
CLI), so it has a dedicated config — `playwright.prod.config.ts` — with no
`webServer` and no `baseURL`. Run it against the live URL:

```bash
PROD_URL=https://<the real url> npx playwright test --config playwright.prod.config.ts
```

It asserts: home returns 200 over HTTPS with a canonical pointing at the real
host, and that `/og/default.png` and `/favicon.svg` load.

## 9. Wire the link out

- Add the site URL to your GitHub profile (bio + profile "website" field).
- Add it to LinkedIn: <https://www.linkedin.com/in/oluwatobiloba-bilewu>.
- Add it to your CV.
- Pin `assertkit` and `craft-factory` (and `tobi-dev` itself) on your GitHub
  profile via the web UI (Customize your pins).

## 10. Known follow-ups / punch list

- **CV**: `public/cv/tobi-dev-qa.pdf` is committed (a QA-targeted resume) and the About-page download link is live. Swap the file to update it.
- **assertkit case study — fact-check before sharing widely.** `src/content/caseStudies/assertkit.mdx` was written from summary notes, not a read of the real repo. The obviously-safe numbers and one commit SHA have already been softened to hedged phrasing, but verify each of these against `C:\Users\HP\Downloads\assertkit` (or the live repo) and restore the specifics if they're right / rewrite if they're wrong:
  - the `generate` stdout format and the `"(N assumptions to check)"` counter (§"What I built");
  - the review-notes file's exact shape (`## Assumptions` heading + AC-2/AC-3 example bullets);
  - "the classifier is instructed to fall back to `real-regression`" on ambiguity;
  - the specific invariants `tests/ai-output.spec.js` is described as asserting;
  - the unit-test count and the e2e passed/skipped split (now stated as "green" / "passing with the AI-output specs skipped" — put real numbers back if you want them);
  - the strict-mode locator fix (the commit SHA was removed — re-add it if it resolves in the public repo);
  - `AIQA_MODEL`, `claude-opus-5`, `docs/DESIGN.md`, `docs/testing-ai-output.md`, `@anthropic-ai/sdk` — plausible but unverified.
- **npm audit**: 9 high advisories (7 dev-only LHCI chain, 2 build-time-only: astro + sharp). `test:audit` is advisory in CI. Clear them with an Astro major-version upgrade when convenient — schedule it as its own task. The CI `hygiene` step currently reports the count into the job summary; consider snapshotting the current number and failing only if it *grows*, so the acceptance is a baseline rather than a blanket.
- **Lighthouse CI**: `test:lh` is a blocking `quality` step; it can't run on Windows locally (chrome-launcher EPERM) but works on Ubuntu. If the first CI run shows Lighthouse score flakiness, move that step to `continue-on-error`.
- **Test loader debt**: `test/component/*.test.ts` render `.astro` through a hand-rolled ESM loader (`test/support/astro-hooks.mjs`, with `@astrojs/compiler` + `esbuild` pinned). It works, but it's already forcing `.card` / `.tag-filter` CSS to live in `global.css` instead of scoped `<style>` blocks. Migrate the component tests to Vitest + `astro/config`'s `getViteConfig()` post-launch and move that CSS back into the components.
- **Terminal casts (asciinema)**: the site currently uses screenshots + inline SVG diagrams only; the `AsciinemaPlayer` component was removed as dead code. If you later record `.cast` files: re-add a player component with props `{ src, title }`, vendor `asciinema-player`'s standalone JS + CSS into `public/vendor/` (no external CDN), lazy-load it with an `IntersectionObserver` in an `is:inline` script, and render a `<figure>` poster fallback when a cast file is absent.
- **Visual regression**: `e2e/visual.spec.ts` baselines are `-chromium-win32`. On the first CI run the `visual` job (already `continue-on-error`) will report missing Linux baselines — download the run's artifact or run `npx playwright test e2e/visual.spec.ts --update-snapshots` on Linux, commit the `-linux` PNGs, then promote the `visual` job to a blocking check.
- **craft-factory `_overrides.json`**: add `blurb`/`featured` entries for new repos as they appear so the gallery reads well.
- **favicon**: the favicon is a plain placeholder monogram (`public/favicon.svg` — a blue rounded square with white "tb", linked from `src/layouts/Base.astro`). Swap the file if you want a custom mark; the production smoke asserts `/favicon.svg` loads, so keep that path.
