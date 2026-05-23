// IntegrationCard — one collapsible card per integration on the P16
// Integrations page. Each card has its own dirty/save state so the admin
// can save Jira independently of Google (per OQ-AP-13, section-scoped EP-22).
//
// Composition:
//   .ac-int-card
//   ├── header  (glyph + title + health pill)
//   ├── body    (children — the section's form fields)
//   └── footer  (inline section-scoped SaveBar — only when dirty/saving)
//
// Props:
//   - title      string — section title (e.g. "Jira", "Google Workspace")
//   - glyph      ReactNode — brand glyph (Jira / Sheets / Gmail / Google)
//   - health     'ok' | 'warn' | 'failed' | 'idle' (StatusPill tone)
//   - healthText optional override for the pill text (default = StatusPill default)
//   - dirty      boolean — has the user edited the section?
//   - saving     boolean — is a save in flight?
//   - error      optional error message (renders an AlertBanner above the body)
//   - onSave     callback when the section's Save button is clicked
//   - onDiscard  callback when the section's Discard button is clicked
//   - onRetry    optional — when health === 'failed', shown alongside the error banner
//   - children   the section body (fields)
//
// a11y: the title is rendered as an <h2>. Health pill is the unified
// <StatusPill>. The inline SaveBar already exposes role="status" + the
// Save button is properly labelled. Each card has an aria-labelledby
// pointing at its title so AT users can identify the section.

import { useId } from 'react';

import StatusPill from '../pills/StatusPill';
import AlertBanner from '../banners/AlertBanner';
import SaveBar from '../settings/SaveBar';

import './IntegrationCard.css';

export default function IntegrationCard({
  title,
  glyph,
  health = 'idle',
  healthText,
  dirty = false,
  saving = false,
  error,
  onSave,
  onDiscard,
  onRetry,
  children,
}) {
  const titleId = useId();
  const state = saving ? 'saving' : (dirty ? 'dirty' : 'saved');

  return (
    <section
      className={`ac-int-card${error ? ' is-error' : ''}`}
      aria-labelledby={titleId}
    >
      <header className="ac-int-card__head">
        <div className="ac-int-card__title-line">
          {glyph ? (
            <span className="ac-int-card__glyph" aria-hidden="true">
              {glyph}
            </span>
          ) : null}
          <h2 id={titleId} className="ac-int-card__title">{title}</h2>
        </div>
        <StatusPill tone={health} size="md">
          {healthText || undefined}
        </StatusPill>
      </header>

      {error ? (
        <div className="ac-int-card__error">
          <AlertBanner
            tone="danger"
            title={`${title} connection failed`}
            body={error}
            action={onRetry ? { label: 'Retry', onClick: onRetry } : undefined}
          />
        </div>
      ) : null}

      <div className="ac-int-card__body">
        {children}
      </div>

      <footer className="ac-int-card__foot">
        <SaveBar
          state={state}
          onSave={onSave}
          onDiscard={onDiscard}
          primaryLabel="Save section"
          className="ac-int-card__savebar"
        />
      </footer>
    </section>
  );
}
