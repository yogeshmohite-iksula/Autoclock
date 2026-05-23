// TeamCard — per-team summary card on the Management Dashboard (P10).
// Renders the team's identity strip (colour swatch + name + lead avatar),
// utilisation %, week hrs / week target, headcount, and a tiny sparkline
// for the last few weeks. Click-through is a link to the team's PM scope
// (eventual `/team?team_id=…`) but for M0 we leave the link off — the page
// uses this purely as a read-only summary.
//
// Props
//   team   { id, name, lead, color, people, weekHrs, weekTarget, util, sparkData }
//
// `weekHrs` and `weekTarget` are expected to be hours (number), matching
// the org dashboard mock shape. `util` is the precomputed percentage we
// trust the server (or mock) to compute — we render it verbatim.

import Sparkline from '../charts/Sparkline';
import { initials } from '../../lib/format';
import './TeamCard.css';

function utilTone(util) {
  if (util == null) return 'info';
  if (util >= 85) return 'ok';
  if (util >= 70) return 'warn';
  return 'bad';
}

export default function TeamCard({ team }) {
  if (!team) return null;
  const tone = utilTone(team.util);
  const leadInitials = initials(team.lead) || '?';

  return (
    <article
      className={`ac-team-card ac-team-card--tone-${tone}`}
      role="group"
      aria-label={`${team.name} — utilisation ${team.util ?? 0} percent`}
    >
      <div className="ac-team-card__head">
        <span className="ac-team-card__swatch" style={{ background: team.color || 'var(--ac-text)' }} aria-hidden="true" />
        <div className="ac-team-card__name-wrap">
          <div className="ac-team-card__name" title={team.name}>{team.name}</div>
          <div className="ac-team-card__lead">
            <span className="ac-team-card__lead-av" style={{ background: team.color || 'var(--ac-text-muted)' }} aria-hidden="true">{leadInitials}</span>
            <span className="ac-team-card__lead-nm" title={team.lead}>{team.lead}</span>
          </div>
        </div>
        <span className={`ac-team-card__pct ac-team-card__pct--${tone}`} aria-label={`utilisation ${team.util ?? 0}%`}>
          {team.util ?? 0}%
        </span>
      </div>

      <div className="ac-team-card__bar" aria-hidden="true">
        <div
          className={`ac-team-card__bar-fill ac-team-card__bar-fill--${tone}`}
          style={{ width: `${Math.max(0, Math.min(100, team.util || 0))}%` }}
        />
      </div>

      <div className="ac-team-card__meta">
        <div className="ac-team-card__hrs">
          <strong>{team.weekHrs ?? 0}h</strong>
          <span className="ac-team-card__hrs-sub">of {team.weekTarget ?? 0}h</span>
        </div>
        <div className="ac-team-card__people">
          <strong>{team.people ?? 0}</strong> people
        </div>
        <div className="ac-team-card__spark" aria-hidden="true">
          <Sparkline
            values={Array.isArray(team.sparkData) && team.sparkData.length ? team.sparkData : [0, 0]}
            width={80}
            height={24}
            color={team.color || 'var(--ac-text)'}
            areaFill={null}
            ariaLabel={`${team.name} weekly trend`}
          />
        </div>
      </div>
    </article>
  );
}
