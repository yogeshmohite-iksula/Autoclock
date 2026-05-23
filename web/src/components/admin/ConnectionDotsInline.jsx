// ConnectionDotsInline — small Jira + Google "ok / missing" pill (two dots
// side-by-side with a tooltip). Used in the UserTableRow on P14 and intended
// for re-use in P16 Integrations summary.
//
// Status values: 'ok' | 'miss' | 'pending'. Anything else → unknown (grey).
// a11y: each dot has aria-label so screen readers announce per-provider state.

import './ConnectionDotsInline.css';

const STATUS_META = {
  ok:      { tone: 'ok',     label: 'connected' },
  miss:    { tone: 'miss',   label: 'missing' },
  pending: { tone: 'warn',   label: 'pending' },
};

function ConnectionDot({ provider, status }) {
  const meta = STATUS_META[status] || { tone: 'unknown', label: 'unknown' };
  const ariaLabel = `${provider} ${meta.label}`;
  return (
    <span
      className={`ac-conn-dot ac-conn-dot--${meta.tone}`}
      role="img"
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <span className="ac-conn-dot__letter" aria-hidden="true">
        {provider === 'Jira' ? 'J' : 'G'}
      </span>
    </span>
  );
}

export default function ConnectionDotsInline({ conn }) {
  const jira   = conn?.jira   || 'miss';
  const google = conn?.google || 'miss';
  return (
    <span className="ac-conn-dots" role="group" aria-label="Integration health">
      <ConnectionDot provider="Jira" status={jira} />
      <ConnectionDot provider="Google" status={google} />
    </span>
  );
}
