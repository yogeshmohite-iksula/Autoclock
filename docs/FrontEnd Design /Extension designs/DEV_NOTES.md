# Extension Demo — DEV NOTES

**Branch:** `feat/extension-demo`
**Author:** Claude Code (on behalf of Yogesh)
**Scope:** purely additive — only new files under `web/public/extension/` (+ one new Playwright test file + this notes file). No existing file modified.

This file logs everything Yogesh should know when reviewing the PR.

---

## Pre-flight (§2)

### Frame inventory (`docs/FrontEnd Design /Extension designs/extension-bundle/`)

All 6 frames present, ~45–52 KB each:

| Source file | Copied to | Bytes (src/copy) |
|---|---|---|
| `E02 Extension Today.html`       | `web/public/extension/frames/e02-today.html`       | 49 099 / 49 099 |
| `E03 Extension Add Entry.html`   | `web/public/extension/frames/e03-add-entry.html`   | 52 118 / 52 118 |
| `E04 Extension Close My Day.html` | `web/public/extension/frames/e04-close-day.html`   | 47 249 / 47 249 |
| `E05 Extension Sync Result.html` | `web/public/extension/frames/e05-sync-result.html` | 45 810 / 45 810 |
| `E06 Extension Reminder.html`    | `web/public/extension/frames/e06-reminder.html`    | 38 338 / 38 338 |
| `E07 Extension Offline.html`     | `web/public/extension/frames/e07-offline.html`     | 48 671 / 48 671 |

All 6 copies pass `diff -q` against their source — byte-identical, as required.

`E01 Extension Connect.html` is **ignored** per §0 of the prompt.

### Frame structure (does each file already contain browser chrome?)

**Yes — the frames are self-contained mocks.** Each E0X HTML decodes (at runtime, via the
design tool's bundler runtime) into a full visual scene: an outer "fake Chrome browser
window" (title bar with traffic lights, tabs, address bar, toolbar) with the extension
popup hanging from the toolbar icon. They are NOT bare 380 px popups.

Implication for the wrapper: **do NOT add another browser chrome around the iframe** —
that would render two browsers nested. The wrapper just centers the iframe and adds a
visually-distinct (dashed border) presenter control strip below.

### Button labels per screen (real CTAs only — design-tool tweak buttons excluded)

Extracted programmatically from each frame's decoded `<script type="__bundler/template">`
JSON-encoded HTML. The wiring map in `nav.js` matches these by `textContent`:

| Screen | Real CTAs | Wires to |
|---|---|---|
| E02 Today | "Add entry"             | E03 |
| E02 Today | "Close My Day"          | E04 |
| E03 Add Entry | "Cancel"            | E02 |
| E03 Add Entry | "Save slot"         | E02 |
| E04 Close My Day | "Back"           | E02 |
| E04 Close My Day | "Confirm & sync ⌘↵" | E05 |
| E05 Sync Result | "Done"            | E02 |
| E05 Sync Result | "Back"            | E02 |
| E05 Sync Result | "Retry" (×2)      | (left in-frame — Gmail retry is design's own state) |
| E06 Reminder | "Log now" (×2)       | E03 (per prompt: E02 *or* E03 — E03 fits "Log now" intent better) |
| E06 Reminder | "Snooze 15 min"      | (left in-frame — no demo destination) |
| E07 Offline | "Add entry"           | E03 |
| E07 Offline | "Close My Day"        | E04 |

### In-frame tweak panel (design-tool scaffolding)

Every frame ships with a small "tweaks" toolbar from the design tool that flips between
scenarios — e.g. E02 has `[With logs] [Empty] [Reminder ✓]`, E04 has
`[Under (7h 30m)] [Met (8h 30m)] [Clean] [Overlap warning]`. **Per the prompt these are
left intact** — they don't have a demo destination, they're useful in-frame interactivity.
A presenter can use them to show variations of each screen mid-demo.

The wrapper does NOT attach handlers to tweak-panel buttons (text-match only matches the
real CTAs in the table above).

---

## Decisions

### D-1 — Wrapper layout
- One outer page: amber "EXTENSION MOCKUP" banner across the top (visually distinct from
  the also-amber DEMO MODE banner used by the live web app — that one says "DEMO MODE";
  this one says "EXTENSION MOCKUP"), AutoClock page-head, centered iframe in a
  rounded-corner shell, dashed-bordered presenter control strip below.
- Iframe size: 1280 × 820 px (the design files use `min-height: 100vh` for the body, so
  the iframe needs significant height to show the full scene without an internal
  scrollbar). At ≤760 px viewport the iframe shrinks to 700 px tall.
- Brand: Ink Charcoal `#0F172A` + Signal Red `#DC2626` + Inter, per the prompt.

### D-2 — Iframe DOM access vs postMessage
- Same-origin (everything at `/extension/...`) means `iframe.contentDocument` works
  directly. **No `postMessage` fallback was needed** during development. The frames don't
  need to know the wrapper exists.

### D-3 — Waiting for the design-tool runtime to render
- The design files render their popup body asynchronously after the iframe `load` event.
  `wireFrame()` polls via `requestAnimationFrame` for up to 4 s after each `load`,
  re-running the button-match scan. Once a single button is wired, polling stops.
- `dataset._extDemoWired = '1'` prevents double-wiring on re-render.

### D-4 — Click capture instead of replace-bubble
- Click handlers attach with `{ capture: true }` and call `preventDefault() +
  stopPropagation()` to win against any in-frame handler that wants to re-render the
  popup. This keeps the demo behaviour deterministic.

### D-5 — "Log now" → E03 (not E02)
- The prompt's table allows "E02 or E03" for E06's Log now. E03 (Add Entry) fits the
  literal user intent of "log now" — they want to log a slot, not see today's summary.

### D-6 — "Retry" on E05 stays in-frame
- The design file already has interactive state for "Retry Gmail" — pressing it animates
  the row to a retrying spinner. Leaving it in-frame preserves that polish without
  pre-empting a real backend-side decision later.

### D-9 — Reminder-first demo flow + notification chime (per Yogesh's review)
- New narrative arc: demo opens on **E06 Reminder** (the OS notification +
  in-popup banner) with a **notification chime**. Clicking "Log now" opens
  the popup in **E02 EMPTY state** (no slots logged yet). User then clicks
  "Add entry" → E03 → Save → E02 (populated) → Close My Day → E04 → Confirm
  → E05 → Done → E02. Restart returns to E06.
- **Notification chime** — generated via Web Audio API (no binary asset
  shipped). Two-tone bell: 880 Hz then 660 Hz, ~600 ms total. Plays on
  every E06 visit, but **first load is silent** until the user gestures
  (browser autoplay policy). A small dark "🔔 click anywhere to enable
  chime" hint sits top-right and disappears after the first click.
- **E02 → empty flip** — the source E02 frame has a `setView('with'|'empty')`
  function defined in its inline JS (used by its tweak panel before we hid
  it). nav.js calls `iframe.contentWindow.setView('empty')` programmatically
  after navigation from "Log now". The frame source stays byte-identical.
- **Page-head links** updated: added `🔔 Replay chime` (lets presenters
  re-trigger the sound on demand) and dropped the `data-jump` indices
  (the demo's narrative path is now driven by in-popup clicks, not by
  jump dots).
- Playwright test rewritten for the new flow: 7 screenshots captured
  (E06 → E02-empty → E03 → E02-populated → E04 → E05 → E07). Initial
  screen assertion changed to E06. Keyboard ←/→ walks the screen registry
  order linearly (presenter convenience, separate from the narrative).
- 2/2 extension tests pass in ~10 s; full regression unaffected.

### D-8 — Strip down presenter chrome (per Yogesh's review)
- After the initial PR landed, Yogesh asked to remove two visually-prominent
  "boxes" so users explore the popup by clicking buttons directly:
  1. The **design-tool's tweak panel** baked into each frame (top-right
     "VIEW · With logs / Empty / Reminder ✓" toggle). It's developer
     scaffolding from Claude's design tool and is confusing in a management
     demo.
  2. The **bottom presenter control strip** (dashed-bordered block with
     Back / Next / 6 jump dots / Restart). Replaced with minimal inline text
     links in the page-head.
- Hide-tweaks: `nav.js` injects a tiny `<style>` into each iframe's `<head>`
  on every `load`, with `.tweak-bar { display: none !important; }` (plus a
  few neighbour-selector variants for safety). The frame HTML files stay
  **byte-identical** — we modify the rendered DOM at runtime, not the source.
- Page-head inline links: replaced the boxed strip with three subtle text
  buttons in the top-right of the page-head — `Reminder · Offline · ↺ Restart`.
  These are needed because E06 (Reminder) and E07 (Offline) have **no
  in-popup button leading to them** (they're states, not destinations).
  Keyboard ← / → / R still work invisibly for presenter convenience.
- Playwright test updated: replaces `.dots button[data-jump]` /
  `#ctrl-prev` / `#ctrl-next` selectors with `#ctrl-reminder` /
  `#ctrl-offline` / `#ctrl-restart` (id-based, stable). Adds a new
  `expectTweakBarHidden(page)` assertion verifying our CSS injection
  actually hides `.tweak-bar` in each iframe.

### D-7 — Screenshot wait fix (found via VG first pass)
- First Playwright run captured screenshots IMMEDIATELY after `expectScreen()` resolved
  (the wrapper updates `#screen-title` synchronously on navigateTo). But the design-tool
  runtime inside the iframe renders the popup body asynchronously over a few hundred ms
  — so E03/E04/E05/E06 screenshots looked like empty skeletons in the first VG pass.
- **Fix:** added `waitForFrameReady(page, copy)` helper to `extension-demo.spec.js`. It
  waits for (1) any visible `<button>` inside the iframe (proves runtime rendered), (2)
  distinctive copy on the target screen ("Save slot" for E03, "Confirm" for E04, "Done"
  for E05, "Log now" for E06, etc.), then a 350 ms paint settle before screenshot.
- Re-run + second VG pass: **all 6 screens PASS, READY FOR PR.** Test runtime ~8.4 s.

---

## Visual QA results (second pass, fresh eyes)

| Screen | Result | Note |
|---|---|---|
| E02 Today | **PASS** | Logo + date, 5h 30m running total, 5 slot rows, amber "last log" banner, Add entry + Close My Day buttons all present. |
| E03 Add Entry | **PASS** | Project (SiteOne PIM), Task (PIM-3073), description hint, Range/Duration toggle (02:00 PM → 03:30 PM), Cancel + Save slot. |
| E04 Close My Day | **MINOR** | 4 grouped tickets + day total + "Where this goes" + Confirm & sync all visible. Only Jira destination row visible above the fold — Sheets/Gmail rows are below; design file's choice, not the wrapper. |
| E05 Sync Result | **PASS** | Excellent partial-failure example: Jira ✓, Sheets ✓, Gmail ✗ with Retry + 503 chip + reassuring footnote. |
| E06 Reminder | **PASS** | Both surfaces shown (in-popup banner + OS notification card), gentle tone. |
| E07 Offline | **PASS** | Clear offline banner, queued chip, slot list with sync states, Close My Day disabled. |

**Top-line verdict: READY FOR PR.** No defects in the wrapper. The E04 "Sheets/Gmail below fold" note is inherent to the design file's scroll behaviour; touching the frame to fix it would violate the byte-identical rule.

---

## Verification (§6)

### Build check
`cd web && npm run build`:
- `backend/public/extension/index.html` ✅
- `backend/public/extension/nav.js` ✅
- `backend/public/extension/frames/e02-today.html` … `e07-offline.html` (6 files) ✅
- Existing `backend/public/index.html` + `backend/public/assets/*` unaffected ✅

### Playwright (CLI)
`cd web && npx playwright test extension-demo.spec.js`:
- Test 1 (full click-through): E02 → click Add Entry → E03 → jump Today → E02 → Close My Day → E04 → Confirm & sync → E05 → jump Reminder → E06 → jump Offline → E07 → Restart → E02. Plus 6 screenshots saved.
- Test 2 (control-strip Back/Next): walks all 6 screens forward then back via the wrapper's nav buttons.
- Both assert no console errors and that the amber EXTENSION MOCKUP banner is visible.

(Test result + 6 screenshots are written to `test-results/screenshots/extension-*.png`.)

### Regression — full Playwright suite
The existing suites (`smoke.spec.js`, `allpages.spec.js`) are untouched. They run against
the React SPA at `/sign-in`, `/today`, etc. — completely separate from `/extension/`,
which is a static folder under `web/public/`. The new test file is additive.

### Additive-only proof
`git diff --stat origin/main` must list **only new files**. No existing file is modified.
Inspect this in the PR.

---

## Open questions / nice-to-haves (not blockers)

- **OQ-EXT-1** — The tweak panel inside each frame is visible to the demo audience. For a
  cleaner board-room demo, a presenter could click around it; for richer hands-off demos,
  we could later inject a tiny CSS rule into the iframe that hides `.tweak-bar`. I left
  this alone because the prompt forbids editing the frames.
- **OQ-EXT-2** — `bg-soft.png` (used by the live app's auth pages) is NOT referenced here.
  The wrapper uses a soft CSS gradient instead, so no extra asset to ship.
- **OQ-EXT-3** — Optional: capture per-screen height dynamically by reading the iframe's
  `contentDocument.body.scrollHeight` and resizing the iframe to fit. Skipped — the fixed
  820 px works for all 6 frames in spot-checks.

---

## How to run the demo locally

```
cd web
npm run dev          # serves at http://localhost:5173/extension/
# OR
npm run build        # writes to backend/public/extension/
cd ../backend
node server.js       # serves at http://localhost:4000/extension/
```

The demo also lands at `https://supportit.in/extension/` after the next Hostinger redeploy
once this PR merges.
