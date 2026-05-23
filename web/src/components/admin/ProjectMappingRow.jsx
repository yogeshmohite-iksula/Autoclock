// ProjectMappingRow — one row per Project ↔ Jira mapping.
// Desktop: a 6-column horizontal grid row.
//   [swatch+name+kind] [jira-key] [description] [tasks] [last-sync] [status]
//   followed by [actions] (Test inline / Edit).
// Mobile: stacks into a vertical card with the same fields re-flowed.
//
// a11y: rendered as `role="row"` with `<button>`s for actions. Status is
// communicated by icon+text+colour (not colour alone — via StatusPill).
//
// Props
//   project: { id, name, color, initial, kind, key, desc, status, tasks, lastSync }
//   onEdit:  (project) => void
//   onTestResult: ({ project, ok, message }) => void — optional, for parent to
//                update status pill optimistically after an inline test.

import StatusPill from '../pills/StatusPill';
import TestConnectionButton from './TestConnectionButton';
import './ProjectMappingRow.css';

function fmtLastSync(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_TONE = {
  ok:   { tone: 'ok',     label: 'Healthy' },
  fail: { tone: 'failed', label: 'Failing' },
};

export default function ProjectMappingRow({ project, onEdit, onTestResult }) {
  if (!project) return null;
  const statusMeta = STATUS_TONE[project.status] || { tone: 'info', label: project.status || 'Unknown' };

  return (
    <div
      className="ac-mapping-row"
      role="row"
      aria-label={`Project ${project.name}`}
      data-project-id={project.id}
      data-kind={project.kind}
    >
      <div className="ac-mapping-row__proj" role="cell">
        <span
          className="ac-mapping-row__swatch"
          style={{ background: project.color || '#64748B' }}
          aria-hidden="true"
        >
          {project.initial || (project.name || '?').slice(0, 1).toUpperCase()}
        </span>
        <span className="ac-mapping-row__id">
          <span className="ac-mapping-row__name">{project.name}</span>
          <span
            className={`ac-mapping-row__kind ac-mapping-row__kind--${(project.kind || '').toLowerCase()}`}
          >
            {project.kind || '—'}
          </span>
        </span>
      </div>

      <div className="ac-mapping-row__key" role="cell">
        <span className="ac-mapping-row__key-tag" title={`Jira key: ${project.key}`}>
          {project.key || '—'}
        </span>
      </div>

      <div className="ac-mapping-row__desc" role="cell">
        {project.desc || <span className="ac-mapping-row__muted">No description</span>}
      </div>

      <div className="ac-mapping-row__tasks" role="cell">
        <span className="ac-mapping-row__tasks-num">{project.tasks ?? 0}</span>
        <span className="ac-mapping-row__tasks-lbl"> task{project.tasks === 1 ? '' : 's'}</span>
      </div>

      <div className="ac-mapping-row__last-sync" role="cell">
        {fmtLastSync(project.lastSync)}
      </div>

      <div className="ac-mapping-row__status" role="cell">
        <StatusPill tone={statusMeta.tone} size="md">{statusMeta.label}</StatusPill>
      </div>

      <div className="ac-mapping-row__actions" role="cell">
        <TestConnectionButton
          jiraKey={project.key}
          onResult={(res) => onTestResult?.({ project, ...res })}
          label="Test"
          className="ac-mapping-row__test"
        />
        <button
          type="button"
          className="ac-mapping-row__btn"
          onClick={() => onEdit?.(project)}
          aria-label={`Edit mapping for ${project.name}`}
        >
          Edit
        </button>
      </div>
    </div>
  );
}
