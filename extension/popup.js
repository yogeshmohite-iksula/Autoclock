// popup.js — REST client of the backend, same contract as the web app.
// Offline queue is M1 (ERD §14.6); for M0 we just surface an error if the backend is unreachable.

const BACKEND = 'http://localhost:4000'; // M0 demo; M1: set to the Iksula host

async function api(path, opts = {}) {
  const r = await fetch(`${BACKEND}${path}`, {
    method: opts.method || 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j?.error?.message || r.statusText);
  }
  return r.json();
}

document.addEventListener('DOMContentLoaded', async () => {
  const $ = (id) => document.getElementById(id);
  const today = new Date().toISOString().slice(0, 10);
  const err = $('error');

  // --- Tabs ---
  const tabAdd = $('tab-add'), tabToday = $('tab-today');
  const pAdd = $('panel-add'), pToday = $('panel-today'), pSettings = $('panel-settings');
  tabAdd.onclick = () => switchTab('add');
  tabToday.onclick = () => switchTab('today');
  $('settings-toggle').onclick = () => { pSettings.hidden = !pSettings.hidden; };

  function switchTab(name) {
    tabAdd.setAttribute('aria-selected', String(name === 'add'));
    tabToday.setAttribute('aria-selected', String(name === 'today'));
    pAdd.hidden = name !== 'add';
    pToday.hidden = name !== 'today';
    if (name === 'today') refreshToday();
  }

  // --- Projects + Tasks ---
  try {
    const projs = await api('/api/projects');
    $('project').innerHTML = '<option value="">— pick —</option>' +
      projs.projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
  } catch (e) { showError(e.message); }

  $('project').addEventListener('change', async (ev) => {
    const id = ev.target.value;
    const taskSel = $('task');
    taskSel.disabled = true;
    if (!id) return;
    try {
      const r = await api(`/api/projects/${id}/tasks`);
      taskSel.innerHTML = '<option value="">— pick —</option>' +
        r.tasks.map(t => `<option value="${t.id}">${t.jira_key} — ${t.summary || ''}</option>`).join('');
      taskSel.disabled = false;
    } catch (e) { showError(e.message); }
  });

  // --- Add entry ---
  $('entry-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    showError('');
    try {
      await api('/api/entries', {
        method: 'POST',
        body: {
          project_id: parseInt($('project').value, 10),
          jira_task_id: parseInt($('task').value, 10),
          duration_raw: $('duration_raw').value,
          description: $('description').value,
          slot_start: $('slot_start').value,
          slot_end: $('slot_end').value,
          work_date: today,
        },
      });
      e.target.reset();
      switchTab('today');
    } catch (err) { showError(err.message); }
  });

  // --- Today list + Close My Day ---
  async function refreshToday() {
    try {
      const r = await api(`/api/entries?date=${today}`);
      $('today-list').innerHTML = (r.entries || []).map(en =>
        `<li><strong>${en.jira_key}</strong> · ${en.slot_start}–${en.slot_end} · ${Math.floor(en.duration_minutes / 60)}h ${en.duration_minutes % 60}m<br/><small>${en.description}</small></li>`
      ).join('');
    } catch (e) { showError(e.message); }
  }

  $('close-day').addEventListener('click', async () => {
    try {
      const preview = await api('/api/day/preview', { method: 'POST', body: { work_date: today } });
      if (preview.errors?.length) return showError(`Cannot close — ${preview.errors.length} error(s). Open the web app to fix.`);
      if (!confirm(`Confirm sync of ${preview.groups.length} ticket(s) → Jira + Sheet + Gmail?`)) return;
      const result = await api('/api/day/close', { method: 'POST', body: { work_date: today, confirmed: true } });
      alert(`Sync result: ${result.overall}\nJira ok: ${result.jira.ok}, failed: ${result.jira.failed}`);
    } catch (e) { showError(e.message); }
  });

  // --- Settings ---
  chrome.storage.local.get({ reminderMinutes: 120 }, ({ reminderMinutes }) => { $('cadence').value = reminderMinutes; });
  $('cadence-save').addEventListener('click', () => {
    const minutes = parseInt($('cadence').value, 10);
    if (!Number.isFinite(minutes) || minutes < 15) return showError('Cadence must be ≥ 15 minutes');
    chrome.runtime.sendMessage({ type: 'set-cadence', minutes }, () => { pSettings.hidden = true; });
  });

  function showError(msg) { err.hidden = !msg; err.textContent = msg || ''; }
});
