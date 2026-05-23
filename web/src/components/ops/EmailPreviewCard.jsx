// EmailPreviewCard — page-local component (P12 Reminder History only).
// Shows the email body that was sent to recipients, with a "Show / Hide
// preview" toggle. The body is intentionally rendered as plain text inside a
// styled card — no `dangerouslySetInnerHTML` for safety. The mock returns a
// static template; in production it would come from a `templates` field on
// the run or from a separate template endpoint (OQ-AP-10).
//
// Props
//   open       boolean                  — controlled visibility
//   onToggle   () => void               — flip CTA
//   subject    string                   — email subject line
//   from       string                   — "From" line
//   to         string                   — "To" line (e.g. "8 recipients · BCC")
//   body       string                   — plain-text email body
//   when       string                   — when sent ("Fri 22 May 13:00 IST")

import './EmailPreviewCard.css';

export default function EmailPreviewCard({
  open = false,
  onToggle,
  subject,
  from,
  to,
  body,
  when,
}) {
  return (
    <section className="ac-emailcard" aria-label="Email preview">
      <button
        type="button"
        className="ac-emailcard__toggle"
        aria-expanded={open}
        aria-controls="ac-emailcard-body"
        onClick={onToggle}
      >
        <span className="ac-emailcard__toggle-ic" aria-hidden="true">✉</span>
        <span className="ac-emailcard__toggle-lbl">
          {open ? 'Hide email preview' : 'Show email preview'}
        </span>
        <span className="ac-emailcard__toggle-chev" aria-hidden="true">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="ac-emailcard__panel" id="ac-emailcard-body" role="region" aria-label="Email body">
          <header className="ac-emailcard__head">
            {subject && (
              <div className="ac-emailcard__subject">
                <span className="ac-emailcard__field-lbl">Subject</span>
                <span className="ac-emailcard__field-val">{subject}</span>
              </div>
            )}
            <div className="ac-emailcard__meta">
              {from && (
                <div className="ac-emailcard__meta-row">
                  <span className="ac-emailcard__field-lbl">From</span>
                  <span className="ac-emailcard__field-val">{from}</span>
                </div>
              )}
              {to && (
                <div className="ac-emailcard__meta-row">
                  <span className="ac-emailcard__field-lbl">To</span>
                  <span className="ac-emailcard__field-val">{to}</span>
                </div>
              )}
              {when && (
                <div className="ac-emailcard__meta-row">
                  <span className="ac-emailcard__field-lbl">When</span>
                  <span className="ac-emailcard__field-val">{when}</span>
                </div>
              )}
            </div>
          </header>
          <pre className="ac-emailcard__body">{body}</pre>
        </div>
      )}
    </section>
  );
}
