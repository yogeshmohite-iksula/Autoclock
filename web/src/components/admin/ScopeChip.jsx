// ScopeChip — a small read-only chip rendering an OAuth scope name
// (e.g. `read:jira-work`, `gmail.compose`). Used on the Integrations page
// (P16) to render each card's scope set.
//
// No special a11y semantics needed beyond the surrounding context — the
// parent ScopeChip list is already wrapped in a labelled container that
// announces "Scopes" via a heading. We deliberately render a <span> (not
// a <button>) because the chip is informational, not actionable.
//
// Props:
//   - children   the scope label (string or node)
//   - title      optional tooltip / extended description

import './ScopeChip.css';

export default function ScopeChip({ children, title }) {
  return (
    <span className="ac-scope-chip" title={title}>
      <span className="ac-scope-chip__dot" aria-hidden="true" />
      <span className="ac-scope-chip__txt">{children}</span>
    </span>
  );
}
