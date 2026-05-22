// format.js — pure helpers used across the Today screen.
// Extracted from docs/FrontEnd Design/today-app.jsx so the page stays small.

export function initials(name) {
  return String(name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0].toUpperCase())
    .join('');
}

export function fmtTime(hhmm) {
  if (!hhmm) return '—';
  const [h, m] = hhmm.split(':').map(Number);
  const am = h < 12;
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${m.toString().padStart(2, '0')} ${am ? 'AM' : 'PM'}`;
}

export function fmtDur(mins) {
  if (mins == null) return '—';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

export function minsBetween(start, end) {
  const [sh, sm] = String(start).split(':').map(Number);
  const [eh, em] = String(end).split(':').map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

export function addMinsToClock(hhmm, mins) {
  const [h, m] = String(hhmm).split(':').map(Number);
  let total = h * 60 + m + mins;
  total = ((total % 1440) + 1440) % 1440;
  const oh = Math.floor(total / 60), om = total % 60;
  return `${String(oh).padStart(2, '0')}:${String(om).padStart(2, '0')}`;
}

export function greeting(d = new Date()) {
  const h = parseInt(
    new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(d),
    10,
  );
  if (h < 5)  return 'night';
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

/** Parse "1h 30m" style duration text into minutes. */
export function parseDurText(text) {
  const tx = String(text || '').trim();
  const h = parseInt((tx.match(/(\d+)\s*h/i) || [])[1] || '0', 10);
  const m = parseInt((tx.match(/(\d+)\s*m/i) || [])[1] || '0', 10);
  return h * 60 + m;
}

/** Today's date in YYYY-MM-DD, IST-aware. */
export function todayIso() {
  // For M0 the user's machine is in IST (Iksula). Real impl could use
  // Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }) — overkill here.
  return new Date().toISOString().slice(0, 10);
}
