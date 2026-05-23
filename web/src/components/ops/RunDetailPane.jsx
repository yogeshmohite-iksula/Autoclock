// RunDetailPane — page-local component (P12 Reminder History only).
// Right pane: hero with status (live | closed) + total-emailed + complied
// gap, summary line, then the recipients list. The page renders <PersonRow>
// children itself so this component is layout-only and trivially testable.
//
// Props
//   run        Run | null               — required; null → empty state
//   children   ReactNode                — recipient rows (caller renders)
//   trailing   ReactNode                — slot below the recipient list
//   onBack     () => void               — optional; mobile "Back" CTA

import StatusPill from '../pills/StatusPill';
import './RunDetailPane.css';

export default function RunDetailPane({ run, children, trailing, onBack }) {
  if (!run) {
    return (
      <div className="ac-rundetail ac-rundetail--empty" role="status">
        <div className="ac-rundetail__empty-title">No run selected</div>
        <p className="ac-rundetail__empty-sub">
          Pick a reminder run from the list to see who was emailed and who complied.
        </p>
      </div>
    );
  }

  const tone = run.status === 'live' ? 'info' : 'success';
  const statusLabel = run.status === 'live' ? 'Live' : 'Closed';
  const compliedRatio = run.emailed > 0
    ? `${run.complied}/${run.emailed}`
    : '0/0';
  const gap = Math.max(0, (run.emailed || 0) - (run.complied || 0));

  return (
    <div className="ac-rundetail" aria-label={`Details for ${run.label}`}>
      {onBack && (
        <button type="button" className="ac-rundetail__back" onClick={onBack}>
          ← Back to runs
        </button>
      )}

      <header className="ac-rundetail__hero">
        <div className="ac-rundetail__hero-head">
          <div className="ac-rundetail__hero-titlewrap">
            <h2 className="ac-rundetail__title" data-run-id={run.id}>{run.label}</h2>
            <div className="ac-rundetail__hero-when">{run.when}</div>
          </div>
          <StatusPill tone={tone}>{statusLabel}</StatusPill>
        </div>

        <p className="ac-rundetail__summary">{run.summary}</p>

        <div className="ac-rundetail__hero-stats">
          <div className="ac-rundetail__mini-stat">
            <div className="ac-rundetail__mini-num">{run.emailed}</div>
            <div className="ac-rundetail__mini-lbl">total emailed</div>
          </div>
          <div className="ac-rundetail__mini-stat">
            <div className="ac-rundetail__mini-num">{compliedRatio}</div>
            <div className="ac-rundetail__mini-lbl">complied within 24h</div>
          </div>
          <div className="ac-rundetail__mini-stat">
            <div className={`ac-rundetail__mini-num${gap > 0 ? ' is-warn' : ''}`}>{gap}</div>
            <div className="ac-rundetail__mini-lbl">complied gap</div>
          </div>
        </div>
      </header>

      <section className="ac-rundetail__recipients" aria-label="Recipients">
        <h3 className="ac-rundetail__section-title">Recipients</h3>
        {children}
      </section>

      {trailing && <div className="ac-rundetail__trailing">{trailing}</div>}
    </div>
  );
}
