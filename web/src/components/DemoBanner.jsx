// DemoBanner — a thin top-of-page ribbon that warns the user the SPA is
// running on in-memory mocks. Only rendered when VITE_USE_MOCKS is truthy
// (the default) — when set to 'false' for real-backend deploys, the
// callsite in routes.jsx evaluates to `false && <DemoBanner/>` which Vite
// tree-shakes out, so this component contributes ZERO bytes to a real-prod
// bundle. Safe to keep in the repo permanently.

import './DemoBanner.css';

export default function DemoBanner() {
  return (
    <div className="ac-demo-banner" role="status" aria-label="Demo mode notice">
      <span className="ac-demo-banner__ic" aria-hidden="true">⚠</span>
      <strong>DEMO MODE</strong>
      <span className="ac-demo-banner__sub">
        — data is not saved · all actions are simulated · Jira / Sheets / Gmail are mocked
      </span>
    </div>
  );
}
