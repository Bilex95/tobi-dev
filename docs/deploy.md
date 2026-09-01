# Deploy runbook — tobi-dev

A one-time checklist the site owner runs to take this branch live on Vercel and
wire up the weekly cache-refresh loop. Everything here is a manual step performed
from the owner's account — the repo build (Tasks 1–14) does none of it.

Prerequisites: the [`gh`](https://cli.github.com/) CLI authenticated as `Bilex95`,
a Vercel account, and this branch (`build/portfolio-v1`) checked out locally.

---

## 1. Create the GitHub repo

```bash
gh repo create Bilex95/tobi-dev --public --source . --remote origin --push
```

That pushes the current branch. Then either open a PR into `main`:

```bash
git push -u origin build/portfolio-v1
gh pr create --base main --head build/portfolio-v1 \
  --title "Portfolio site v1" --body "Astro 5 + Tailwind static portfolio."
```

…or, if you would rather skip review, push straight to `main`:

```bash
git branch -m build/portfolio-v1 main   # or: git checkout -b main && git push -u origin main
git push -u origin main
```

The rest of this runbook assumes `main` is the production branch.

## 2. Import into Vercel

1. Vercel dashboard → **Add New… → Project** → import `Bilex95/tobi-dev`.
2. Framework preset auto-detects as **Astro**. Leave build command
   (`astro build`) and output directory (`dist`) at their defaults.
3. Deploy. Note the assigned `*.vercel.app` URL.
4. If the URL is **not** `https://tobi-dev.vercel.app`, either:
   - rename the Vercel project (Settings → General → Project Name) so the domain
     becomes `tobi-dev.vercel.app`, **or**
   - update the hard-coded site URL in three places and redeploy:
     - `site:` in `astro.config.mjs`
     - `SITE` in `src/lib/seo.ts`
     - `BASE` default in `e2e/production.spec.ts`

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

## 4. Branch protection (R12)

On `Bilex95/tobi-dev` → **Settings → Branches → Add branch ruleset** (or classic
branch protection) for `main`:

- Require a pull request before merging.
- **Require status checks to pass before merging**, and select these four checks
  from `.github/workflows/ci.yml`:
  - `unit`
  - `e2e`
  - `quality`
  - `hygiene`

Leave `visual` unchecked — it is advisory (`continue-on-error`) until Linux
screenshot baselines are committed (see punch list).

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

Kick the weekly workflow manually to populate the cache now instead of waiting
for Tuesday:

```bash
gh workflow run "Refresh projects cache" --repo Bilex95/tobi-dev
gh run watch --repo Bilex95/tobi-dev
```

Confirm the run committed an updated, populated `src/data/projects.cache.json`
(commit message `chore: refresh projects cache`) and that Vercel redeployed.

## 8. Post-deploy smoke

`e2e/production.spec.ts` is excluded from the normal `npm run test:e2e` run via
`testIgnore` in `playwright.config.ts`, so run it explicitly against the live URL:

```bash
PROD_URL=https://<the real url> npx playwright test e2e/production.spec.ts --config playwright.config.ts
```

It asserts: home returns 200 over HTTPS with a canonical pointing at the real
host, and that `/og/default.png` and `/robots.txt` load.

## 9. Wire the link out

- Add the site URL to your GitHub profile (bio + profile "website" field).
- Add it to LinkedIn: <https://www.linkedin.com/in/oluwatobiloba-bilewu>.
- Add it to your CV.
- Pin `assertkit` and `craft-factory` (and `tobi-dev` itself) on your GitHub
  profile via the web UI (Customize your pins).

## 10. Known follow-ups / punch list

- **CV**: no `public/cv/tobi-dev-qa.pdf` exists — the About-page download link is hidden until you commit one, then flip `e2e/about.spec.ts`'s `toHaveCount(0)`→`1`.
- **assertkit case study**: `src/content/caseStudies/assertkit.mdx` contains a few tool-internal specifics (the `generate` stdout / "(N assumptions to check)" counter, the review-notes file shape, "classifier falls back to real-regression on ambiguity", the exact invariants `tests/ai-output.spec.js` asserts) that were written from summary notes, not the real repo — spot-check each against `C:\Users\HP\Downloads\assertkit` and soften anything that doesn't match before sharing the site widely.
- **npm audit**: 9 high advisories (7 dev-only LHCI chain, 2 build-time-only: astro + sharp). `test:audit` is advisory in CI. Clear them with an Astro major-version upgrade when convenient — schedule it as its own task.
- **Lighthouse CI**: `test:lh` is a blocking `quality` step; it can't run on Windows locally (chrome-launcher EPERM) but works on Ubuntu. If the first CI run shows Lighthouse score flakiness, move that step to `continue-on-error`.
- **Visual regression**: `e2e/visual.spec.ts` baselines are `-chromium-win32`. On the first CI run the `visual` job (already `continue-on-error`) will report missing Linux baselines — download the run's artifact or run `npx playwright test e2e/visual.spec.ts --update-snapshots` on Linux, commit the `-linux` PNGs, then promote the `visual` job to a blocking check.
- **craft-factory `_overrides.json`**: add `blurb`/`featured` entries for new repos as they appear so the gallery reads well.
- **favicon**: this project ships none. `e2e/production.spec.ts` checks `/robots.txt` instead. Add `public/favicon.svg` + a `<link rel="icon">` in `src/layouts/Base.astro` when convenient, then add a favicon assertion back to the production smoke.
