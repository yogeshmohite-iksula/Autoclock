// PreviewPage — FR-04 mandatory preview + confirm before any external write.
// Shows grouped tickets, total minutes, warnings. Confirm calls EP-13.
// Stub/legacy route at /preview. The polished version lands in a later PR.

import { useEffect, useState } from 'react';
import { api } from '../api';

export default function PreviewPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { refresh(); }, []);
  async function refresh() {
    setError(null);
    try { setPreview(await api.day.preview(today)); } catch (e) { setError(e.message); }
  }

  async function onConfirm() {
    setBusy(true); setError(null);
    try { setResult(await api.day.close(today)); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  if (!preview && !error) return <div className="ac-card">Loading preview…</div>;
  if (error) return <div className="ac-card ac-banner ac-banner--danger" role="alert">{error}</div>;

  const blocked = preview.errors?.length > 0;

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section className="ac-card">
        <h2 style={{ marginTop: 0 }}>Close My Day — Preview ({preview.work_date})</h2>
        <p>Total: <strong>{Math.floor(preview.total_minutes / 60)}h {preview.total_minutes % 60}m</strong></p>

        {preview.groups.length === 0
          ? <p style={{ color: 'var(--ac-text-muted)' }}>Nothing to sync yet.</p>
          : <table className="ac-table">
              <thead><tr><th>Ticket</th><th>Total</th><th>What I'll write</th></tr></thead>
              <tbody>
                {preview.groups.map(g => (
                  <tr key={g.jira_key}>
                    <td><code className="ac-chip-ticket">{g.jira_key}</code></td>
                    <td>{Math.floor(g.minutes / 60)}h {g.minutes % 60}m</td>
                    <td>{g.lines.join('; ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        }

        {preview.warnings?.length > 0 && (
          <p style={{ color: 'var(--ac-warning-text)' }} role="status">
            ⚠ {preview.warnings.length} warning(s) — including overlap(s). You can still confirm; review first.
          </p>
        )}
        {blocked && (
          <p style={{ color: 'var(--ac-danger-text)' }} role="alert">
            ⛔ {preview.errors.length} error(s) block Confirm — fix your entries.
          </p>
        )}

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="ac-btn ac-btn--outline" onClick={refresh} disabled={busy}>Refresh</button>
          <button
            className="ac-btn ac-btn--accent"
            onClick={onConfirm}
            disabled={blocked || busy || preview.groups.length === 0}
          >
            {busy ? 'Syncing…' : 'Confirm & sync to Jira + Sheet + Gmail'}
          </button>
        </div>
      </section>

      {result && (
        <section className="ac-card" aria-live="polite">
          <h3 style={{ marginTop: 0 }}>Sync result — {result.overall}</h3>
          <ul>
            <li>Jira worklogs: {result.jira.ok} ok / {result.jira.failed} failed</li>
            <li>Sheet rows appended: {result.sheet.rows_appended}</li>
            <li>Gmail draft id: <code>{result.gmail.draft_id || '—'}</code></li>
          </ul>
        </section>
      )}
    </div>
  );
}
