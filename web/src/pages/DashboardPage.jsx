// DashboardPage — PM/Lead team dashboard for M0 (EP-14). Mgmt dashboard is M1 (EP-15).
// Stub/legacy route at /dashboard. The polished version lands in a later PR.

import { useEffect, useState } from 'react';
import { api } from '../api';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.dashboard.team()
      .then(setData)
      .catch(e => setError(e.message));
  }, []);

  if (error) return <div className="ac-card ac-banner ac-banner--danger" role="alert">{error}</div>;
  if (!data) return <div className="ac-card">Loading dashboard…</div>;

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      <section className="ac-card" aria-labelledby="kpi-heading">
        <h2 id="kpi-heading" style={{ marginTop: 0 }}>Team KPIs</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <Kpi label="Logged today" value={data.kpis?.team_logged_today ?? 0} />
          <Kpi label="Tickets in progress" value={(data.by_ticket || []).length} />
          <Kpi label="Not logged today" value={(data.not_logged_today || []).length} />
        </div>
      </section>

      <section className="ac-card">
        <h3 style={{ marginTop: 0 }}>Effort by Jira ticket — today</h3>
        {(!data.by_ticket || data.by_ticket.length === 0)
          ? <p style={{ color: 'var(--ac-text-muted)' }}>No worklogs today yet.</p>
          : <table className="ac-table">
              <thead><tr><th>Ticket</th><th>Time</th></tr></thead>
              <tbody>
                {data.by_ticket.map(r => (
                  <tr key={r.jira_key}>
                    <td><code className="ac-chip-ticket">{r.jira_key}</code></td>
                    <td>{Math.floor(r.minutes / 60)}h {r.minutes % 60}m</td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </section>

      <section className="ac-card">
        <h3 style={{ marginTop: 0 }}>Members</h3>
        <table className="ac-table">
          <thead><tr><th>Name</th><th>Today</th></tr></thead>
          <tbody>
            {(data.members || []).map(m => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{Math.floor((m.minutes_today || 0) / 60)}h {(m.minutes_today || 0) % 60}m</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Kpi({ label, value }) {
  return (
    <div className="ac-card" style={{ background: 'var(--ac-surface-2)', padding: 16 }}>
      <div className="ac-label">{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{value}</div>
    </div>
  );
}
