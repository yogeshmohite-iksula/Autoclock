// ResultRow — one row per destination system on the Sync Result page (P05).
// Layout (desktop): [glyph | StatusPill | title + detail | actions]
// Layout (mobile):  [glyph     | StatusPill        ]
//                   [title + detail                  ]
//                   [actions (right-aligned)         ]
//
// Host page owns the CSS — selectors live under `.page-sync-result .res-row …`.
// This component is class-only and reuses the unified <StatusPill> (success /
// failed / retrying / skipped / partial — never colour-alone).
//
// Source: docs/FrontEnd Design /Sync Result.html — the three ResultRow blocks
// inside .results-list. Prototype scaffolding (useTweaks, EDITMODE,
// data-comment-anchor) stripped.

import JiraGlyph from '../glyphs/JiraGlyph';
import SheetsGlyph from '../glyphs/SheetsGlyph';
import GmailGlyph from '../glyphs/GmailGlyph';
import StatusPill from '../pills/StatusPill';

const GLYPHS = {
  jira:   <JiraGlyph size={28} />,
  sheets: <SheetsGlyph size={28} />,
  gmail:  <GmailGlyph size={28} />,
};

// Map EP-13 per-system status → StatusPill tone (canonical taxonomy).
function toneFor(status) {
  switch (status) {
    case 'success':  return 'success';
    case 'failure':  return 'failed';
    case 'retrying': return 'retrying';
    case 'skipped':  return 'skipped';
    default:         return 'pending';
  }
}

/**
 * @param {object} props
 *   - system   'jira' | 'sheets' | 'gmail'
 *   - status   'success' | 'failure' | 'retrying' | 'skipped' | 'pending'
 *   - title    short label (e.g. "Jira worklogs")
 *   - detail   React node — body text under the title (success summary / error)
 *   - actions  React node — buttons / links on the right edge
 */
export default function ResultRow({ system, status, title, detail, actions }) {
  return (
    <div className={`res-row res-row--${system} res-row--${status}`} role="group" aria-label={`${title}: ${status}`}>
      <div className="ic" aria-hidden="true">{GLYPHS[system]}</div>
      <StatusPill tone={toneFor(status)} size="md" />
      <div className="body">
        <div className="title-line">{title}</div>
        {detail && <div className="detail">{detail}</div>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}
