// ConnRow — one row per external provider on /settings and /admin/integrations.
// Shows the provider icon, name, status pill, account meta, and Reconnect/
// Disconnect actions. When `status === 'expired'`, an inline warning banner
// renders inside the row prompting the user to reconnect.
//
// Props:
//   provider     'jira' | 'google' (lowercase short id)
//   status       'connected' | 'disconnected' | 'expired' | 'pending'
//   account      optional account string to show below the title
//   expiresAt    optional ISO date (rendered as "expires …")
//   onReconnect  callback for the Reconnect button
//   onDisconnect callback for the Disconnect button
//   busy         disables both action buttons while a parent op is in flight
//
// Body-class agnostic — selectors live under .ac-conn-row in
// settings-components.css.

import '../../styles/settings-components.css';

const PROVIDER_META = {
  jira: {
    label: 'Jira',
    glyph: 'J',
    accountSuffix: 'iksula.atlassian.net',
    iconClass: 'ac-conn-row__ico--jira',
  },
  google: {
    label: 'Google Workspace',
    glyph: 'G',
    accountSuffix: 'Sheets + Gmail scopes',
    iconClass: 'ac-conn-row__ico--google',
  },
};

const STATUS_TAG = {
  connected:    { tone: 'ok',   text: 'Connected' },
  pending:      { tone: 'info', text: 'Pending' },
  expired:      { tone: 'warn', text: 'Reconnect needed' },
  disconnected: { tone: 'off',  text: 'Disconnected' },
};

export default function ConnRow({
  provider,
  status = 'connected',
  account,
  expiresAt,
  onReconnect,
  onDisconnect,
  busy = false,
}) {
  const meta = PROVIDER_META[provider] || PROVIDER_META.jira;
  const tag = STATUS_TAG[status] || STATUS_TAG.connected;
  const isExpired = status === 'expired';
  const isDisconnected = status === 'disconnected';
  const pip = isExpired ? '!' : (isDisconnected ? '·' : '✓');

  return (
    <div className={`ac-conn-row${isExpired ? ' is-warn' : ''}${isDisconnected ? ' is-off' : ''}`}>
      <div
        className={`ac-conn-row__ico ${meta.iconClass}`}
        aria-hidden="true"
      >
        <span className="ac-conn-row__glyph">{meta.glyph}</span>
        <span className={`ac-conn-row__pip ac-conn-row__pip--${tag.tone}`} aria-hidden="true">
          {pip}
        </span>
      </div>

      <div className="ac-conn-row__main">
        <div className="ac-conn-row__title-line">
          <span className="ac-conn-row__title">{meta.label}</span>
          <span className={`ac-conn-row__tag ac-conn-row__tag--${tag.tone}`}>
            {tag.text}
          </span>
        </div>
        <div className="ac-conn-row__meta">
          <span>{account || meta.accountSuffix}</span>
          {expiresAt ? (
            <span className="ac-conn-row__age"> · expires {expiresAt}</span>
          ) : null}
        </div>
      </div>

      <div className="ac-conn-row__actions">
        <button
          type="button"
          className={`ac-btn ac-btn--${isExpired ? 'warn' : 'ghost'}`}
          onClick={onReconnect}
          disabled={busy}
        >
          Reconnect
        </button>
        <button
          type="button"
          className="ac-btn ac-btn--danger"
          onClick={onDisconnect}
          disabled={busy || isDisconnected}
        >
          Disconnect
        </button>
      </div>

      {isExpired ? (
        <div className="ac-conn-row__warn" role="alert">
          <span className="ac-conn-row__warn-ico" aria-hidden="true">!</span>
          <div>
            <strong>Your {meta.label} token expired.</strong>{' '}
            AutoClock can&apos;t post on your behalf until you reconnect. Past entries are queued and will sync once you&apos;re back in.
          </div>
        </div>
      ) : null}
    </div>
  );
}
