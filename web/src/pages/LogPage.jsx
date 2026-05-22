// LogPage — the employee log screen (FR-01, FR-02). Project → dependent Jira task → describe → save.
// Owns: Yogesh (parser/QA flow) + Ali (UI). Wired to EP-06, EP-07, EP-08, EP-09.

import { useEffect, useState } from 'react';
import { api } from '../api';

export default function LogPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ project_id: '', jira_task_id: '', description: '', duration_raw: '', slot_start: '', slot_end: '', work_date: today });
  const [error, setError] = useState(null);

  useEffect(() => { api.projects().then(d => setProjects(d.projects)).catch(e => setError(e.message)); }, []);
  useEffect(() => { api.entries(today).then(d => setEntries(d.entries)).catch(e => setError(e.message)); }, [today]);

  function onProjectChange(e) {
    const project_id = e.target.value;
    setForm(f => ({ ...f, project_id, jira_task_id: '' }));
    if (!project_id) { setTasks([]); return; }
    api.tasksForProject(project_id).then(d => setTasks(d.tasks)).catch(err => setError(err.message));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    try {
      const payload = { ...form, project_id: parseInt(form.project_id, 10), jira_task_id: parseInt(form.jira_task_id, 10) };
      await api.createEntry(payload);
      const refreshed = await api.entries(today);
      setEntries(refreshed.entries);
      setForm(f => ({ ...f, description: '', duration_raw: '', slot_start: '', slot_end: '' }));
    } catch (err) { setError(err.message); }
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section className="card" aria-labelledby="add-entry-heading">
        <h2 id="add-entry-heading" style={{ marginTop: 0 }}>Add entry</h2>
        {error && <p role="alert" style={{ color: 'var(--ac-danger)' }}>{error}</p>}
        <form onSubmit={onSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          <div style={{ gridColumn: 'span 2' }}>
            <label htmlFor="project">Project</label>
            <select id="project" value={form.project_id} onChange={onProjectChange} required>
              <option value="">— pick —</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label htmlFor="task">Jira task</label>
            <select id="task" value={form.jira_task_id} onChange={e => setForm(f => ({ ...f, jira_task_id: e.target.value }))} required disabled={!tasks.length}>
              <option value="">— pick —</option>
              {tasks.map(t => <option key={t.id} value={t.id}>{t.jira_key} — {t.summary}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label htmlFor="duration">Duration (e.g. 1h 30m)</label>
            <input id="duration" value={form.duration_raw} onChange={e => setForm(f => ({ ...f, duration_raw: e.target.value }))} required />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label htmlFor="slot-start">Slot start (HH:MM)</label>
            <input id="slot-start" value={form.slot_start} onChange={e => setForm(f => ({ ...f, slot_start: e.target.value }))} required pattern="\d{2}:\d{2}" />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label htmlFor="slot-end">Slot end (HH:MM)</label>
            <input id="slot-end" value={form.slot_end} onChange={e => setForm(f => ({ ...f, slot_end: e.target.value }))} required pattern="\d{2}:\d{2}" />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label htmlFor="desc">What you did</label>
            <input id="desc" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary">Save entry</button>
          </div>
        </form>
      </section>

      <section className="card" aria-labelledby="today-heading">
        <h2 id="today-heading" style={{ marginTop: 0 }}>Today</h2>
        {entries.length === 0
          ? <p style={{ color: 'var(--ac-muted)' }}>No entries yet — log your first slot above.</p>
          : <table><thead><tr><th>Slot</th><th>Ticket</th><th>Description</th><th>Duration</th></tr></thead>
              <tbody>
                {entries.map(e => (
                  <tr key={e.id}>
                    <td>{e.slot_start}–{e.slot_end}</td>
                    <td>{e.jira_key}</td>
                    <td>{e.description}</td>
                    <td>{Math.floor(e.duration_minutes / 60)}h {e.duration_minutes % 60}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </section>
    </div>
  );
}
