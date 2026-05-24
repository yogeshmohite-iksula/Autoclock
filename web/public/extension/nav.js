// nav.js — wrapper logic for the extension click-through demo.
// Pure vanilla JS, zero dependencies. Same-origin DOM access into the
// iframe is fine because every frame is served from /extension/frames/
// (same origin as this wrapper). No postMessage, no edits to the frames.
//
// Pattern: on every iframe `load`, give the design-tool's runtime a
// moment to render, then walk the iframe's DOM looking for the primary
// CTAs by their exact button text — captured from the source frames in
// DEV_NOTES.md — and attach navigation handlers. In-frame interactivity
// (tweak panel, dropdowns, form inputs) is left intact.

(() => {
  // ── screen registry ────────────────────────────────────────────────────
  // Index drives the Back / Next controls. Each entry: id, title, file,
  // and the click-wiring map for that screen.
  // Wiring: trim() + collapse-whitespace match against each <button>'s
  // textContent. Pass an array of accepted labels to be liberal.
  const SCREENS = [
    {
      id: 'e02', title: 'E02 · Today',
      file: 'frames/e02-today.html',
      wire: {
        'Add entry':     'e03',
        'Close My Day':  'e04',
      },
    },
    {
      id: 'e03', title: 'E03 · Add Entry',
      file: 'frames/e03-add-entry.html',
      wire: {
        'Cancel':    'e02',
        'Save slot': 'e02',
      },
    },
    {
      id: 'e04', title: 'E04 · Close My Day',
      file: 'frames/e04-close-day.html',
      wire: {
        'Back':              'e02',
        'Confirm & sync ⌘↵': 'e05',
        // The source has it as `Confirm &amp; sync ⌘↵` in raw HTML; once
        // it lands in the live DOM, textContent decodes the entity so the
        // string we compare against is `Confirm & sync ⌘↵`. Both forms
        // listed to be safe.
        'Confirm &amp; sync ⌘↵': 'e05',
      },
    },
    {
      id: 'e05', title: 'E05 · Sync Result',
      file: 'frames/e05-sync-result.html',
      wire: {
        'Done': 'e02',
        'Back': 'e02',
        // 'Retry' stays in-frame (Gmail retry is part of the design's
        // own interactivity — not a navigation target in this demo).
      },
    },
    {
      id: 'e06', title: 'E06 · Reminder',
      file: 'frames/e06-reminder.html',
      wire: {
        // The notification + the in-popup banner both say "Log now".
        // Both jump to Add Entry — that's where the user goes to log.
        'Log now':       'e03',
        // 'Snooze 15 min' stays in-frame — informational button.
      },
    },
    {
      id: 'e07', title: 'E07 · Offline',
      file: 'frames/e07-offline.html',
      wire: {
        'Add entry':    'e03',
        'Close My Day': 'e04',
      },
    },
  ];

  const idToIndex = Object.fromEntries(SCREENS.map((s, i) => [s.id, i]));

  // ── DOM refs ───────────────────────────────────────────────────────────
  const $frame   = document.getElementById('frame');
  const $title   = document.getElementById('screen-title');
  const $prev    = document.getElementById('ctrl-prev');
  const $next    = document.getElementById('ctrl-next');
  const $restart = document.getElementById('ctrl-restart');
  const $dots    = document.querySelectorAll('.dots button[data-jump]');

  let currentIndex = 0;

  // ── navigation ─────────────────────────────────────────────────────────
  function navigateTo(index, opts = {}) {
    if (index < 0 || index >= SCREENS.length) return;
    if (!opts.force && index === currentIndex && $frame.src.endsWith(SCREENS[index].file)) return;
    currentIndex = index;
    const screen = SCREENS[index];
    $title.textContent = screen.title;
    $frame.src = screen.file;
    // Update dot active state
    $dots.forEach((b, i) => b.setAttribute('aria-current', i === index ? 'true' : 'false'));
    // Update Back/Next enabled state
    $prev.disabled = index === 0;
    $next.disabled = index === SCREENS.length - 1;
  }
  function navigateToId(id) {
    const i = idToIndex[id];
    if (i != null) navigateTo(i);
  }
  function next()    { navigateTo(Math.min(SCREENS.length - 1, currentIndex + 1)); }
  function prev()    { navigateTo(Math.max(0, currentIndex - 1)); }
  function restart() { navigateTo(0, { force: true }); }

  // ── in-iframe wiring ───────────────────────────────────────────────────
  // Normalise button text: collapse whitespace + trim. Matches the wire
  // map keys regardless of how the design tool emitted whitespace.
  function btnText(btn) {
    return (btn.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function wireFrame() {
    const screen = SCREENS[currentIndex];
    const doc = $frame.contentDocument;
    if (!doc) return false;

    const buttons = doc.querySelectorAll('button, a[role="button"], [data-cta]');
    let wiredCount = 0;
    buttons.forEach((btn) => {
      const txt = btnText(btn);
      const target = screen.wire[txt];
      if (!target) return;
      if (btn.dataset._extDemoWired === '1') return;
      btn.dataset._extDemoWired = '1';
      // Capture phase + stopPropagation so we win against any in-frame
      // handler that may want to re-render the same screen.
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        navigateToId(target);
      }, { capture: true });
      wiredCount++;
    });
    return wiredCount > 0;
  }

  // The design-tool runtime renders the popup body asynchronously after
  // the initial `load` event fires. We poll for up to 4 s, then give up
  // (the screen is still usable — just no wired navigation, which is
  // expected on E06/E07 anyway since their wiring lists are minimal).
  function onFrameLoaded() {
    const start = Date.now();
    const tick = () => {
      const ok = wireFrame();
      if (ok || Date.now() - start > 4000) return;
      requestAnimationFrame(tick);
    };
    tick();
  }

  // ── control strip wiring ───────────────────────────────────────────────
  $prev.addEventListener('click', prev);
  $next.addEventListener('click', next);
  $restart.addEventListener('click', restart);
  $dots.forEach((b) => b.addEventListener('click', () => navigateTo(+b.dataset.jump)));
  $frame.addEventListener('load', onFrameLoaded);

  // Keyboard: ← / → to navigate. Avoids stealing keys inside the iframe
  // (the iframe gets its own keyboard focus when clicked).
  window.addEventListener('keydown', (e) => {
    if (e.target !== document.body) return;
    if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'r' || e.key === 'R') restart();
  });

  // Initial state — first screen, kick the load listener for the
  // already-loading iframe.
  navigateTo(0, { force: true });
})();
