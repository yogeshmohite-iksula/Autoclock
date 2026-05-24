// nav.js — wrapper logic for the extension click-through demo.
//
// Demo entry point: E06 Reminder (with a notification chime). Clicking
// "Log now" on the reminder opens the popup in EMPTY state — the user
// then adds an entry and the rest of the flow plays naturally.
//
// Pure vanilla JS, zero deps. Same-origin DOM access into the iframe is
// fine because every frame is served from /extension/frames/. Frame HTML
// files stay byte-identical — we hide the design-tool's tweak panel and
// flip E02 to its empty state via RUNTIME-injected CSS / function calls,
// never by editing the frames themselves.

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
        'Confirm &amp; sync ⌘↵': 'e05',
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
        // "Log now" on the OS notification AND the in-popup banner both
        // wire to E02 in EMPTY state — that's the demo's narrative arc:
        // a reminder fires, the user opens an empty popup, then logs.
        'Log now': 'e02-empty',
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
  const START_ID = 'e06';                    // demo opens on the reminder
  let nextE02State = null;                    // 'empty' or null

  // ── DOM refs ───────────────────────────────────────────────────────────
  const $frame    = document.getElementById('frame');
  const $title    = document.getElementById('screen-title');
  const $reminder = document.getElementById('ctrl-reminder');
  const $offline  = document.getElementById('ctrl-offline');
  const $chime    = document.getElementById('ctrl-chime');
  const $restart  = document.getElementById('ctrl-restart');
  const $hint     = document.getElementById('sound-hint');

  let currentIndex = idToIndex[START_ID];

  // ── audio (notification chime) ─────────────────────────────────────────
  // Web Audio API — generated tones, no binary asset shipped. Modern
  // browsers block autoplay until a user gesture; we listen for the first
  // click anywhere and unlock + replay the chime if we're on E06 then.
  let audioCtx = null;
  let userHasGestured = false;
  function ensureAudioCtx() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { return null; }
    }
    return audioCtx;
  }
  function playChime() {
    const ctx = ensureAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    if (ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const playTone = (freq, start, dur, vol = 0.18) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    };
    // Two-tone notification: 880Hz then 660Hz — soft "ding-dong" feel.
    playTone(880, now,        0.4);
    playTone(660, now + 0.22, 0.5);
  }
  function unlockAudio() {
    if (userHasGestured) return;
    userHasGestured = true;
    if ($hint) $hint.style.display = 'none';
    // If we're currently on E06, replay the chime now that audio is unlocked.
    if (SCREENS[currentIndex].id === 'e06') playChime();
  }
  window.addEventListener('click',   unlockAudio, { capture: true });
  window.addEventListener('keydown', unlockAudio, { capture: true });

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
    // pseudo-id "e02-empty" → navigate to e02 and flip it to empty
    if (id === 'e02-empty') {
      nextE02State = 'empty';
      id = 'e02';
    }
    const i = idToIndex[id];
    if (i != null) navigateTo(i);
  }
  function next()    { navigateTo(Math.min(SCREENS.length - 1, currentIndex + 1)); }
  function prev()    { navigateTo(Math.max(0, currentIndex - 1)); }
  function restart() {
    // Restart returns to the demo's entry point (E06 with chime) AND
    // primes E02 to be empty next time it's visited via "Log now".
    nextE02State = null;
    navigateTo(idToIndex[START_ID], { force: true });
  }

  // ── inside-iframe work (runs on every iframe load) ─────────────────────

  // Hide the design-tool's scenario toggle (top-right "VIEW · With logs /
  // Empty / Reminder ✓" panel) — purely a runtime CSS modification, the
  // frame source files remain byte-identical.
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

  function applyPendingStateChanges() {
    const screen = SCREENS[currentIndex];
    const win = $frame.contentWindow;
    if (!win) return;
    // E02 has a `setView('with'|'empty')` defined in its source JS that
    // its (now-hidden) tweak panel uses. We call it programmatically to
    // flip to the empty state when navigated to from the reminder flow.
    if (screen.id === 'e02' && nextE02State === 'empty') {
      try { if (typeof win.setView === 'function') win.setView('empty'); } catch (_) {}
      nextE02State = null;
    }
  }

  function wireFrame() {
    const screen = SCREENS[currentIndex];
    const doc = $frame.contentDocument;
    if (!doc) return false;

    injectStyles(doc);
    applyPendingStateChanges();

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

    // On E06, play the notification chime once the body has rendered
    // (will be silent on first load until the user gestures — that's
    // browser autoplay policy; the unlockAudio listener catches up).
    if (screen.id === 'e06' && wiredCount > 0) playChime();

    return wiredCount > 0;
  }

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
  if ($chime) $chime.addEventListener('click', () => {
    // Always replay chime on demand, whether or not E06 is current.
    playChime();
  });
  $frame   .addEventListener('load', onFrameLoaded);

  // Keyboard shortcuts (presenter convenience, invisible UI):
  //   ←  previous screen   →  next screen   r/R  restart
  window.addEventListener('keydown', (e) => {
    if (e.target !== document.body) return;
    if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') prev();
    else if (e.key === 'r' || e.key === 'R') restart();
  });

  // Initial state — open the demo on E06 Reminder.
  navigateTo(idToIndex[START_ID], { force: true });
})();
