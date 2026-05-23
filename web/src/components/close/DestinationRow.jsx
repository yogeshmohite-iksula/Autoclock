// DestinationRow — a single Jira / Sheets / Gmail card used in the Close My Day
// "destinations" panel and (in size variant) on Sync Result. The host page owns
// the body-scoped CSS — selectors live under `.page-close-my-day .dest` /
// `.page-sync-result .dest`. This file is class-only.
//
// Source: docs/FrontEnd Design /Close My Day.html — the three `<div className="dest">`
// blocks under SECTION 2 (Destinations).

/**
 * @param {object} props
 *   - icon           a React node — usually <JiraGlyph/>, <SheetsGlyph/>, <GmailGlyph/>
 *   - title          short label (e.g. "Jira worklogs")
 *   - status         'ready' | 'success' | 'failure' | 'retrying' (default 'ready')
 *   - actionLine     React node — the "X worklogs will be posted" line
 *   - detail         React node — bottom dashed-border block (Posted by …)
 *   - children       optional — extra content (e.g. mini-list under the action line)
 */
export default function DestinationRow({ icon, title, status = 'ready', actionLine, detail, children }) {
  const okLabel = {
    ready: 'Ready',
    success: 'Synced',
    failure: 'Failed',
    retrying: 'Retrying',
  }[status] || 'Ready';

  return (
    <div className={`dest dest--${status}`}>
      <div className="top-row">
        <div className="ic">{icon}</div>
        <span className="ok">{okLabel}</span>
      </div>
      <div className="title">{title}</div>
      {actionLine && <div className="action-line">{actionLine}</div>}
      {children}
      {detail && <div className="detail">{detail}</div>}
    </div>
  );
}
