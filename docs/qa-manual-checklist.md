# Manual QA checklist — run before each deploy

The automated suite (`npm run test:ci` + `npm run test:e2e`, see `README.md` and
spec §5) covers build, types, unit/component/content, functional e2e, the axe
scan, responsive, HTML validity, structural SEO, links, and — on CI — Lighthouse.

This checklist is the layer the suite **cannot** reach (spec §5.3 "Manual /
pre-deploy"): human judgement on keyboard flow, screen-reader output, how the
social cards actually render on Facebook/X, Google's Rich Results view, the
`rebuild.yml` workflow, reduced-motion, and a real cross-browser eyeball.

Run the whole list before the first launch. Before later deploys, run at least
**Keyboard-only**, **Reduced-motion**, and (when metadata or content changed)
**Social preview** + **Rich Results**.

- Preview the production build locally first: `npm run build && npm run preview`
  (serves `http://localhost:4321`).
- "Prod URL" below means `https://tobi-dev.vercel.app` (or the live URL from
  `docs/deploy.md` §2 if it differs).

---

## 1. Keyboard-only pass

Unplug / ignore the mouse. Use **Tab** / **Shift+Tab** to move, **Enter** /
**Space** to activate, **Esc** where relevant.

- [ ] **`/` — skip link.** Load the page, press **Tab** once. Expected: a visible
      "Skip to content" link appears at the top-left; **Enter** moves focus past
      the nav to `<main id="main">`.
- [ ] **`/` — focus visible at every stop.** Tab through the whole page. Expected:
      every interactive element (nav links, theme toggle, hero CTAs, project card
      links, footer links) shows a clear focus ring (`2px solid var(--accent)`);
      focus never lands on a non-interactive element or disappears.
- [ ] **`/` — theme toggle operable.** Tab to the theme toggle, press
      **Enter**/**Space**. Expected: theme flips light⇄dark, focus stays on the
      toggle, choice persists after **F5**.
- [ ] **`/work` — tag filter operable.** Tab to the tag filter controls. Expected:
      each tag is reachable, **Enter**/**Space** toggles it, the visible project
      list updates, and focus stays on the activated control (no jump to top).
- [ ] **`/work` — filter round-trip.** Activate a tag, then clear it by keyboard.
      Expected: the full list returns; no focus loss.
- [ ] **One case study (`/case-studies/assertkit`) — no keyboard trap.** Tab from
      the top of the page all the way through to the footer, then **Shift+Tab**
      back. Expected: you can enter and leave every interactive element (the
      in-page section nav, prev/next links) and reach the browser chrome —
      nothing captures focus permanently.
- [ ] **Prev/next links.** On the case study, Tab to the prev/next case-study
      links and activate one with **Enter**. Expected: navigation happens; the
      next page's focus starts at a sensible place.
- [ ] **`/404`.** Load a bad URL, Tab through. Expected: the "back home" link is
      reachable and works.

## 2. Screen-reader spot check

Windows: **NVDA** (Firefox or Chrome). macOS: **VoiceOver** (`Cmd+F5`, Safari).

- [ ] **`/` — landmark navigation.** Use the landmarks rotor (NVDA: `D` /
      elements list; VoiceOver: `VO+U` → Landmarks). Expected: `banner` (nav),
      `main`, `contentinfo` (footer) are all present and announced once each; no
      duplicate or nameless landmarks.
- [ ] **`/case-studies/assertkit` — landmark navigation.** Same check. Expected:
      `main` wraps the article content; nav + footer announce as banner /
      contentinfo.
- [ ] **`/` — heading outline.** Pull up the headings list (NVDA: `H` / elements
      list; VoiceOver rotor). Expected: exactly one `h1`; `h2`/`h3` nest without
      skipping levels; the outline reads as a sensible table of contents.
- [ ] **`/case-studies/assertkit` — heading outline.** Same. Expected: one `h1`
      (the case-study title); the six section headings (`Context`, `Problem`,
      `What I built`, `Key decisions & tradeoffs`, `Verification`,
      `Results & what's next`) are `h2` and in order.
- [ ] **Images & diagrams announce meaningful text.** Arrow through the case
      study. Expected: every screenshot / architecture diagram announces a
      description of what it shows (not "image", not a filename, not empty);
      decorative images are skipped (empty `alt`).
- [ ] **Theme toggle announces its state.** Focus the toggle. Expected: it
      announces a name **and** current state (e.g. "Switch to light theme,
      button" or a pressed/`aria-pressed` state that flips when toggled) — not
      just "button".

## 3. Social preview

Deploy first, then use the live URL.

- [ ] **Facebook Sharing Debugger** — <https://developers.facebook.com/tools/debug/>.
      Paste the prod URL, "Scrape Again". Expected: `og:title`, `og:description`,
      and a 1200×630 preview image from `/og/default.png` all render; no
      "missing property" errors for title/description/image.
- [ ] **X / Twitter Card Validator** — paste the prod URL (or check the card
      preview via the post composer). Expected: `summary_large_image` card with
      the correct title, description, and the `og/default.png` image.
- [ ] **Per-page cards (optional).** Repeat for `/case-studies/assertkit` and the
      blog post — confirm each has its own title/description.

## 4. Google Rich Results Test

<https://search.google.com/test/rich-results>

- [ ] **`/`** — run the test. Expected: a **Person** item is detected, no errors
      (warnings about recommended fields are acceptable).
- [ ] **One `Article` page** — run on `/case-studies/assertkit` (or
      `/blog/building-a-portfolio-pipeline`). Expected: an **Article** item is
      detected, no errors.
- [ ] JSON-LD parses (no "Parsing error" / "Invalid JSON-LD" banner) on both.

## 5. `act` dry run of `rebuild.yml`

`act` (<https://github.com/nektos/act>) may not be installed — this command is
the reference; skip if unavailable and rely on a real `workflow_dispatch` after
launch (`docs/deploy.md` §7).

- [ ] Run: `act workflow_dispatch -W .github/workflows/rebuild.yml -n`
      Expected: dry run lists the jobs/steps (`checkout`, `setup-node`, `npm ci`,
      run `scripts/refresh-projects.mjs`, "Commit cache if changed", "Trigger
      redeploy") with no config/syntax error.
- [ ] Sanity-read the workflow: the commit step is guarded by
      `git diff --quiet` (no-op when nothing changed) and the redeploy step is
      guarded by `env.DEPLOY_HOOK != ''`.

## 6. Reduced-motion

- [ ] Enable the OS setting: **Windows** Settings → Accessibility → Visual
      effects → *Animation effects* off; **macOS** System Settings →
      Accessibility → Display → *Reduce motion* on.
- [ ] Reload `/` (and scroll it). Expected: no non-essential animation or
      transition plays — no entrance/scroll-reveal animation, no parallax, no
      animated theme-toggle flourish beyond an instant state change. Any motion
      that remains must be essential (e.g. a loading indicator).
- [ ] Toggle the theme with reduced-motion on. Expected: the colour change is
      instant, not animated.

## 7. Cross-browser sanity

The nightly `cross-browser.yml` (Playwright, Firefox + WebKit) covers this
automatically, but eyeball it once before the first launch.

- [ ] Open `/` in **Firefox**. Expected: layout matches Chrome; theme toggle and
      the `/work` tag filter work; no console errors.
- [ ] Open `/` in **Safari** (macOS) or a **WebKit** build
      (`npx playwright open --browser=webkit https://tobi-dev.vercel.app`).
      Expected: same — fonts, spacing, focus rings, and both interactive widgets
      behave.
- [ ] Spot-check `/work` and one case study in whichever of the two you have
      handy.

---

## Sign-off

- [ ] All applicable boxes above are checked for this deploy.
- [ ] Any new issue is filed or noted in `docs/deploy.md` §10 (punch list).
- [ ] Date + commit SHA recorded here or in the deploy PR:
      `______________  /  ____________`
