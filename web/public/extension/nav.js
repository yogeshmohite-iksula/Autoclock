// nav.js — wrapper logic for the extension click-through demo.
// Pure vanilla JS, zero dependencies. Same-origin DOM access into the
// iframe is fine because every frame is served from /extension/frames/
// (same origin as this wrapper). No postMessage, no edits to the frame
// HTML files — they stay byte-identical to source.
//
// Two things happen on every iframe `load`:
//   1) Inject a tiny <style> into the iframe's <head> that hides the
//      design-tool's "tweak panel" (the View · With logs / Empty /
//      Reminder ✓ toggle in the top-right of each frame). Hiding it via
//      CSS preserves the byte-identical rule — we modify the rendered
//      DOM at runtime, not the source file.
//   2) Walk the iframe's DOM looking for the primary CTAs by their exact
//      button text and attach navigation handlers. In-frame interactivity
//      (dropdowns, form inputs, the Retry on E05) is left intact.

(() => {
  // ── screen registry ────────────────────────────────────────────────────
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
        'Back':                  'e02',
        'Confirm & sync ⌘↵':     'e05',
        'Confirm &amp; sync ⌘↵': 'e05', // entity form, just in case
      },
    },
    {
      id: 'e05', title: 'E05 · Sync Result',
      file: 'frames/e05-sync-result.html',
      wire: {
        'Done': 'e02',
        'Back': 'e02',
      },
    },
    {
      id: 'e06', title: 'E06 · Reminder',
      file: 'frames/e06-reminder.html',
      wire: {
        'Log now': 'e03',
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
  const $frame    = document.getElementById('frame');
  const $title    = document.getElementById('screen-title');
  const $reminder = document.getElementById('ctrl-reminder');
  const $offline  = document.getElementById('ctrl-offline');
  const $restart  = document.getElementById('ctrl-restart');

  let currentIndex = 0;

  // ── navigation ─────────────────────────────────────────────────────────
  function navigateTo(index, opts = {}) {
    if (index < 0 || index >= SCREENS.length) return;
    if (!opts.force && index === currentIndex && $frame.src.endsWith(SCREENS[index].file)) return;
    currentIndex = index;
    const screen = SCREENS[index];
    $title.textContent = screen.title;
    $frame.src = screen.file;
  }
  function navigateToId(id) {
    const i = idToIndex[id];
    if (i != null) navigateTo(i);
  }
  function next()    { navigateTo(Math.min(SCREENS.length - 1, currentIndex + 1)); }
  function prev()    { navigateTo(Math.max(0, currentIndex - 1)); }
  function restart() { navigateTo(0, { force: true }); }

  // ── inside-iframe work (runs on every iframe load) ─────────────────────

  // Tiny CSS injected into the iframe head — hides the design-tool's
  // scenario toggle so demo viewers don't see "developer scaffolding"
  // floating in the top-right of each screen. Selector covers all
  // observed variants across E02–E07.
  const HIDE_TWEAKS_CSS = `
    .tweak-bar, .tweaks, .tweak, [data-tweak-bar],
    [role="toolbar"][aria-label*="weak" i],
    [role="toolbar"][aria-label*="ariant" i],
    [role="toolbar"][aria-label*="cenario" i],
    [role="toolbar"][aria-label*="iew" i] {
      display: none !important;
    }
  `;

  function injectStyles(doc) {
    if (doc.querySelector('style[data-ext-demo="1"]')) return;
    const style = doc.createElement('style');
    style.setAttribute('data-ext-demo', '1');
    style.textContent = HIDE_TWEAKS_CSS;
    (doc.head || doc.documentElement).appendChild(style);
  }

  function btnText(btn) {
    return (btn.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function wireFrame() {
    const screen = SCREENS[currentIndex];
    const doc = $frame.contentDocument;
    if (!doc) return false;

    // Always inject the hide-tweaks CSS — even if no buttons match yet,
    // so the scenario toggle disappears as early as possible.
    injectStyles(doc);

    const buttons = doc.querySelectorAll('button, a[role="button"], [data-cta]');
    let wiredCount = 0;
    buttons.forEach((btn) => {
      const txt = btnText(btn);
      const target = screen.wire[txt];
      if (!target) return;
      if (btn.dataset._extDemoWired === '1') return;
      btn.dataset._extDemoWired = '1';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        navigateToId(target);
      }, { capture: true });
      wiredCount++;
    });
    return wiredCount > 0;
  }

  // Poll for up to 4 s — the design-tool runtime renders progressively.
  function onFrameLoaded() {
    const start = Date.now();
    const tick = () => {
      const ok = wireFrame();
      if (ok || Date.now() - start > 4000) return;
      requestAnimationFrame(tick);
    };
    tick();
  }

  // ── outside-iframe wiring (page-head extras + keyboard) ────────────────
  $reminder.addEventListener('click', () => navigateToId('e06'));
  $offline .addEventListener('click', () => navigateToId('e07'));
  $restart .addEventListener('click', restart);
  $frame   .addEventListener('load', onFrameLoaded);

  // Keyboard shortcuts (handy for presenters — invisible UI):
  //   ←  previous screen   →  next screen   r/R  restart
  window.addEventListener('keydown', (e) => {
    if (e.target !== document.body) return;
    if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'r' || e.key === 'R') restart();
  });

  navigateTo(0, { force: true });
})();
