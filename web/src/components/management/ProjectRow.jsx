// ProjectRow — one row of the top-projects table on the Management Dashboard
// (P10). Rendered inside a semantic <tr> so the parent <table> is keyboard +
// screen-reader friendly. Project hue is rendered inline (no per-row CSS).
//
// Props
//   project { id, name, key, color, weekHrs, util }
//   rank    1-based rank shown in the leading cell

import './ProjectRow.css';

function utilTone(util) {
  if (util == null) return 'info';
  if (util >= 85) return 'ok';
  if (util >= 70) return 'warn';
  return 'bad';
}

export default function ProjectRow({ project, rank }) {
  if (!project) return null;
  const tone = utilTone(project.util);
  const pct = Math.max(0, Math.min(100, project.util ?? 0));

  return (
    <tr className="ac-proj-row" data-tone={tone}>
      <td className="ac-proj-row__rank" aria-label={`Rank ${rank}`}>{rank}</td>
      <td className="ac-proj-row__name-cell">
        <span className="ac-proj-row__swatch" style={{ background: project.color || 'var(--ac-text)' }} aria-hidden="true" />
        <span className="ac-proj-row__name" title={project.name}>{project.name}</span>
        {project.key && (
          <span className="ac-proj-row__key" aria-label={`Jira key prefix ${project.key}`}>{project.key}</span>
        )}
      </td>
      <td className="ac-proj-row__hrs">
        <strong>{project.weekHrs ?? 0}</strong>
        <span className="ac-proj-row__hrs-sub">h</span>
      </td>
      <td className="ac-proj-row__util">
        <div className="ac-proj-row__bar" aria-hidden="true">
          <div
            className={`ac-proj-row__bar-fill ac-proj-row__bar-fill--${tone}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className={`ac-proj-row__pct ac-proj-row__pct--${tone}`} aria-label={`utilisation ${pct}%`}>
          {pct}%
        </span>
      </td>
    </tr>
  );
}
