// RunListRail — page-local component (P12 Reminder History only).
// Left-rail list of past reminder runs. Each row: name + when + type chip
// (friday/monday/manual) + emailed/complied counts + by-whom.
//
// Selected row uses `aria-current="true"` and the `.is-selected` class so the
// CSS can highlight without colour-only signaling.
//
// Props
//   runs       Array<Run>         — required
//   selectedId string|null        — current ?runId
//   onSelect   (id: string) => void

import './RunListRail.css';

const TYPE_LABEL = {
  friday: 'Friday',
  monday: 'Monday',
  manual: 'Manual',
};

export default function RunListRail({ runs = [], selectedId, onSelect }) {
  if (!runs.length) {
    return (
      <div className="ac-runlist ac-runlist--empty" role="status">
        No reminder runs match this filter yet.
      </div>
    );
  }
  return (
    <ul className="ac-runlist" role="list" aria-label="Reminder runs">
      {runs.map((r) => {
        const isOn = r.id === selectedId;
        const compliedRatio = r.emailed > 0 ? `${r.complied}/${r.emailed}` : '0/0';
        const typeLbl = TYPE_LABEL[r.type] || r.type;
        return (
          <li key={r.id} className={`ac-runlist__item${isOn ? ' is-selected' : ''}`}>
            <button
              type="button"
              className="ac-runlist__row"
              aria-current={isOn ? 'true' : undefined}
              onClick={() => onSelect?.(r.id)}
            >
              <div className="ac-runlist__row-head">
                <span className="ac-runlist__label" title={r.label}>{r.label}</span>
                <span className={`ac-runlist__chip ac-runlist__chip--${r.type}`}>{typeLbl}</span>
              </div>
              <div className="ac-runlist__row-when">{r.when}</div>
              <div className="ac-runlist__row-stats">
                <span className="ac-runlist__stat">
                  <span className="ac-runlist__stat-num">{r.emailed}</span>
                  <span className="ac-runlist__stat-lbl">emailed</span>
                </span>
                <span className="ac-runlist__stat">
                  <span className="ac-runlist__stat-num">{compliedRatio}</span>
                  <span className="ac-runlist__stat-lbl">complied</span>
                </span>
              </div>
              <div className="ac-runlist__row-by">
                by {r.auto ? 'auto' : (r.by || 'system')}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
