// NextActionCard — "What to do next" panel shown below the per-system rows
// when the overall sync isn't all-success. Two numbered hint rows:
//   1) Retry (or stand by, if anything is currently retrying).
//   2) Or close anyway — background queue will keep trying.
//
// Host page owns the CSS — selectors live under `.page-sync-result .next-card …`.
// Source: docs/FrontEnd Design /Sync Result.html — the `<div className="next-card">`
// shown when !allOk. Prototype scaffolding stripped.

import { Link } from 'react-router-dom';

/**
 * @param {object} props
 *   - anyFail     boolean — any system in 'failure' state
 *   - anyRetry    boolean — any system currently 'retrying'
 */
export default function NextActionCard({ anyFail, anyRetry }) {
  return (
    <div className="next-card" role="region" aria-label="What to do next">
      <div className="label">What to do next</div>
      {anyFail && (
        <div className="row">
          <span className="n" aria-hidden="true">1</span>
          <div>
            <b>Hit Retry on the failed row.</b> Most network blips clear in
            seconds. If it fails again, check your token in{' '}
            <Link to="/settings">Settings → Connected accounts</Link>.
          </div>
        </div>
      )}
      {anyRetry && !anyFail && (
        <div className="row">
          <span className="n" aria-hidden="true">1</span>
          <div>
            <b>Stay on this page</b> until the retry finishes — usually a few
            seconds. We&apos;ll update the row as soon as the destination responds.
          </div>
        </div>
      )}
      <div className="row">
        <span className="n" aria-hidden="true">2</span>
        <div>
          <b>Or close anyway.</b> AutoClock will keep retrying in the background
          and ping you if it can&apos;t recover.
        </div>
      </div>
    </div>
  );
}
